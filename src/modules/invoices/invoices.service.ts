import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import * as mercadopago from 'mercadopago';
import { DB_CONNECTION_FACTORY } from '../../database/database.providers';
import { DatabaseHelper } from '../../database/database.helper';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { NotifyPaymentDto } from './dto/notify-payment.dto';
import { VipData } from './dto/vip-data.dto';
import { MercadoPagoMetadata } from './dto/mercadopago-metadata.dto';
import { getActualDate, addDays, formatDate, remainingDays } from '../../common/utils/date.utils';
import { discountValue, discountCount, vipNames, vipNumber, serverNames, serverPrefix, vipPrices } from '../../database/db.config';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private dolarBlueValue = 950;
  private readonly dolarBlueAPI = 'https://api.bluelytics.com.ar/v2/latest';

  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
    private readonly databaseHelper: DatabaseHelper,
    private readonly configService: ConfigService,
  ) {
    mercadopago.configure({
      access_token: this.configService.get('MP_SECRET_ACCESS_TOKEN'),
    });
    this.fetchDolarBlue();
  }

  generateRandomString(length: number): string {
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
    return randomBytes.toString('hex').slice(0, length);
  }

  async calculatePrice(month: number, vip: number | string, svname: string): Promise<number> {
    const vipIndex = typeof vip === 'string' ? parseInt(vip, 10) : vip;
    
    if ((svname === 'gaming' && vipIndex === 8) || (svname === 'vs' && vipIndex === 8)) {
      return 1000;
    }
    
    const adjustedPrice = vipPrices[vipIndex] * this.dolarBlueValue;
    const finalPrice = adjustedPrice * discountValue[month];

    return Math.round(finalPrice / 10) * 10;
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto): Promise<{ preferenceId: string }> {
    const { username, month, vip, svname, server } = createInvoiceDto;

    if (!username || 
        parseInt(String(month)) < 0 || 
        parseInt(String(month)) > 4 || 
        parseInt(String(vip)) < 0 || 
        parseInt(String(vip)) > 8) {
      throw new BadRequestException('Invalid input parameters');
    }
    const randomId = this.generateRandomString(10);

    const price = await this.calculatePrice(month, vip, svname);

    const desc = vip === 8 ? `(permanente)` : `(por ${discountCount[month]})`;

    let svid: number;
    switch (svname) {
      case 'ps': svid = 0; break;
      case 'tcs': svid = 1; break;
      case 'brick': svid = 2; break;
      case 'gaming': svid = 3; break;
      case 'cg': svid = 4; break;
      case 'vs': svid = 5; break;
      default: svid = 0;
    }

    const titleDetail = serverPrefix[svid];
    const apiUrl = this.configService.get<string>('API_URL');

    const preference = {
      notification_url: `${apiUrl}/api/v1/notify?svname=${svname}&svnum=${server}`,
      items: [
        {
          title: `${titleDetail} ${serverNames[svid][parseInt(String(server))]} ${vipNames[vip]} ${desc} - $${price}`,
          unit_price: price,
          quantity: 1,
        },
      ],
      metadata: {
        username: username,
        days: 31 * discountValue[month],
        month: discountValue[month],
        vip: vipNumber[vip],
        randomId: randomId,
        svname: svname,
        svnum: server
      },
    };

    try {
      const response = await mercadopago.preferences.create(preference);
      await this.sendData(svname, username, randomId);
      
      return { preferenceId: response.body.id };
    } catch (error) {
      this.logger.error(`Error creating invoice: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create invoice');
    }
  }

  private async sendData(svname: string, username: string, randomId: string): Promise<void> {
    if (!username) return;

    const finalDB = await this.databaseHelper.getDbForPayments(svname);
    const pool = await this.dbConnectionFactory(finalDB);

    try {
      const dateInfo = getActualDate();
      await pool.execute(
        'INSERT INTO boletas (fecha, tag, server, random_id, date_inserted) VALUES (?, ?, ?, ?, ?)', 
        [dateInfo, username, username, randomId, dateInfo]
      );
    } catch (error) {
      this.logger.error(`Error saving data: ${error.message}`, error.stack);
    } finally {
      pool.end();
    }
  }

  async getUsernameList(ip: string, svname: string, svnum: number): Promise<any[]> {
    if (!ip) {
      throw new BadRequestException('IP is required');
    }

    let dbname: number;

    if (svname === 'cg') {
      dbname = 11;
    } else if (svname === 'vs') {
      dbname = 8;
    } else if (svname === 'tcs') {
      dbname = svnum === 1 ? 3 : 2;
    } else if (svname === 'brick') {
      dbname = 4;
    } else if (svname === 'gaming') {
      dbname = 7;
    } else {
      if (svnum === 1) dbname = 1;
      else if (svnum === 0) dbname = 0;
      else if (svnum === 2) dbname = 6;
      else if (svnum === 3) dbname = 5;
    }

    return this.databaseHelper.executeQueryById(
      dbname,
      'SELECT Tag FROM publvl WHERE IP=? ORDER BY Nivel DESC',
      [ip]
    );
  }

  async notify(notifyDto: NotifyPaymentDto): Promise<string> {
    const { id } = notifyDto;
    
    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.configService.get('MP_SECRET_ACCESS_TOKEN')}`
        }
      });

      const data = response.data;

      const svnum = data.metadata.svnum
      const svname = data.metadata.svname

    const notification = `Notification for ID: ${id} - Svname: ${svname} - Svtype: ${svnum}`;
    await fs.appendFile('notifications.txt', notification + '\n');

    let dbname: number;
    
    if (svname === 'cg') {
      dbname = 11;
    } else if (svname === 'vs') {
      dbname = 8;
    } else if (svname === 'tcs') {
      dbname = svnum === 1 ? 3 : 2;
    } else if (svname === 'brick') {
      dbname = 4;
    } else if (svname === 'gaming') {
      dbname = 7;
    } else {
      if (svnum === 1) dbname = 1;
      else if (svnum === 0) dbname = 0;
      else if (svnum === 2) dbname = 6;
      else if (svnum === 3) dbname = 5;
      
    }


    const finalDB = await this.databaseHelper.getDbForPayments(svname);
      
      if (data.status_detail === 'accredited' && data.status === 'approved') {
        const isDuplicated = await this.checkPayment(finalDB, data.id);
        if (isDuplicated) {
          return 'Duplicated';
        }

        const modifiedData: VipData = {
          username: data.metadata.username,
          days: data.metadata.days,
          vip: data.metadata.vip,
          expiration_date: '',
          payment_id: data.id,
          info: 'compra',
        };

        if (modifiedData.vip !== 500) {
          const checkDate = new Date();
          modifiedData.expiration_date = addDays(checkDate, modifiedData.days);
        }

        let svid: number;
        switch (svname) {
          case 'ps': svid = 0; break;
          case 'tcs': svid = 1; break;
          case 'brick': svid = 2; break;
          case 'gaming': svid = 3; break;
          case 'cg': svid = 4; break;
          case 'vs': svid = 5; break;
          default: svid = 0;
        }
        if (modifiedData.vip !== 500) {
          modifiedData.title = `[${serverNames[svid][svnum]}] Vip x${modifiedData.vip} (${data.metadata.month} mes${data.metadata.month === 1 ? '' : 'es'})`;
        } else {
          modifiedData.title = `[${serverNames[svid][svnum]}] Administrador (${data.metadata.month} mes${data.metadata.month === 1 ? '' : 'es'})`;
        }

        modifiedData.email = data.payer.email;
        modifiedData.total_amount = data.transaction_details.total_paid_amount;
        modifiedData.net_amount = data.transaction_details.net_received_amount;

        try {
          if (modifiedData.vip !== 500) {
            const success = await this.addVip(dbname, finalDB, modifiedData);
            if (!success) {
              this.logger.error('Failed to add VIP and process payment.');
              
              setTimeout(() => {
                this.notify(notifyDto);
              }, 30 * 60 * 1000);
              
              return 'Failed to process payment';
            } else {
              this.logger.log('VIP added and payment processed successfully.');
            }
          } else {
            await this.addAdminToPayments(finalDB, modifiedData);
          }
          
          return 'done';
        } catch (error) {
          this.logger.error(`An error occurred: ${error.message}`, error.stack);
          throw new BadRequestException('Error processing payment');
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching payment: ${error.message}`, error.stack);
      return 'not found';
    }
    
    return 'Processing complete';
  }

  private async checkPayment(dbname: number, id: string): Promise<boolean> {
    const pool = await this.dbConnectionFactory(dbname);
    
    try {
      const results = await pool.execute('SELECT Tag FROM pagos WHERE Payment_ID=?', [id]);
      return results[0].length > 0;
    } catch (error) {
      this.logger.error(`Error checking payment: ${error.message}`, error.stack);
      return false;
    } finally {
      pool.end();
    }
  }

  async addVip(dbname: number, finalDB: number, data: VipData): Promise<boolean> {
    const dirPath = path.join(process.cwd(), 'vip_logs');
    const filePath = path.join(dirPath, `${data.username}.txt`);

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating directory: ${error.message}`, error.stack);
    }

    const pool = await this.dbConnectionFactory(dbname);
    let success = true;
    let lastResult = null;
    
    try {
      const [log_previous_data] = await pool.execute('SELECT * FROM vips WHERE Tag=?', [data.username]);

      const [result] = await pool.execute('SELECT * FROM vips WHERE Tag=? AND VIP=?;', [data.username, data.vip]);
      lastResult = result;

      if (result.length === 0) {
        let newDate = data.expiration_date;

        const [currentVIP] = await pool.execute('SELECT * FROM vips WHERE Tag=? AND VIP > ?;', [data.username, data.vip]);
        lastResult = currentVIP;

        if (currentVIP.length === 0) {
          const [lastVip] = await pool.execute('SELECT id, Date FROM vips WHERE Date != "" AND Tag=?', [data.username]);
          lastResult = lastVip;

          if (lastVip.length !== 0) {
            const newDays = remainingDays(new Date(), lastVip[0].Date) + 1;

            if (newDays) {
              const [saveVip] = await pool.execute('UPDATE vips SET Date="", Days=? WHERE id=?', [newDays, lastVip[0].id]);
              lastResult = saveVip;
            } else {
              const [saveVip] = await pool.execute('DELETE FROM vips WHERE id=?', [lastVip[0].id]);
              lastResult = saveVip;
            }
          }

          const [createVip] = await pool.execute(
            'INSERT INTO vips (Tag, VIP, Date, Days, Info, Payment_ID) VALUES (?, ?, ?, ?, ?, ?)', 
            [data.username, data.vip, newDate, 0, data.info, data.payment_id]
          );
          lastResult = createVip;
        } else {
          newDate = '';
          const [createVip] = await pool.execute(
            'INSERT INTO vips (Tag, VIP, Date, Days, Info, Payment_ID) VALUES (?, ?, ?, ?, ?, ?)', 
            [data.username, data.vip, newDate, data.days, data.info, data.payment_id]
          );
          lastResult = createVip;
        }
      } else {
        const [createVip] = await pool.execute(
          'INSERT INTO vips (Tag, VIP, Date, Days, Info, Payment_ID) VALUES (?, ?, ?, ?, ?, ?)', 
          [data.username, data.vip, '', data.days, data.info, data.payment_id]
        );
        lastResult = createVip;
      }

      const [log_after_data] = await pool.execute('SELECT * FROM vips WHERE Tag=?', [data.username]);

      const allRowsEmptyDate = log_after_data.every(row => row.Date === "");

      if (allRowsEmptyDate) {
        const [highestVipRow] = await pool.execute(`
          SELECT * 
          FROM vips 
          WHERE Tag = ? AND Date = "" 
          ORDER BY VIP DESC, Days DESC 
          LIMIT 1;
        `, [data.username]);

        if (highestVipRow.length > 0) {
          const vipData = highestVipRow[0];

          const currentDate = new Date();
          const updatedDate = new Date(currentDate);
          updatedDate.setDate(currentDate.getDate() + vipData.Days);

          const formattedDate = updatedDate
            .toLocaleDateString('en-GB')
            .split('/')
            .join('/');

          const [updateResult] = await pool.execute(`
            UPDATE vips 
            SET Date = ?, Days = 0
            WHERE id = ?;
          `, [formattedDate, vipData.id]);
        }
      }

      const previousDataString = JSON.stringify(log_previous_data, null, 2);
      const afterDataString = JSON.stringify(log_after_data, null, 2);

      await fs.appendFile(
        filePath, 
        `Before result:\n${previousDataString}\nAfter result:\n${afterDataString}\n`
      );

      await this.addToPayments(finalDB, data);
    } catch (error) {
      this.logger.error(`Error adding VIP: ${error.message}`, error.stack);
      success = false;
    } finally {
      pool.end();
    }

    return success;
  }

  private async addToPayments(dbname: number, data: VipData): Promise<void> {
    const oldVip = ['', 0];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const pool = await this.dbConnectionFactory(dbname);
    
    try {
      await pool.execute(
        'INSERT INTO pagos (Fecha, Payment_ID, Email, Tag, Server, Due_Date, Old_Due_Date, Old_Vip, Total_Amount, Net_Amount, MonthN, Year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          getActualDate(), 
          data.payment_id, 
          data.email, 
          data.username, 
          data.title, 
          data.expiration_date, 
          oldVip[0], 
          oldVip[1], 
          data.total_amount, 
          data.net_amount, 
          currentMonth, 
          currentYear
        ]
      );
    } catch (error) {
      this.logger.error(`Error adding to payments: ${error.message}`, error.stack);
    } finally {
      pool.end();
    }
  }

  private async addAdminToPayments(dbname: number, data: VipData): Promise<void> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const pool = await this.dbConnectionFactory(dbname);
    
    try {
      await pool.execute(
        'INSERT INTO pagos (Fecha, Payment_ID, Email, Tag, Server, Total_Amount, Net_Amount, MonthN, Year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          getActualDate(), 
          data.payment_id, 
          data.email, 
          data.username, 
          data.title, 
          data.total_amount, 
          data.net_amount, 
          currentMonth, 
          currentYear
        ]
      );
    } catch (error) {
      this.logger.error(`Error adding admin to payments: ${error.message}`, error.stack);
    } finally {
      pool.end();
    }
  }

  async getPayments(month: number, id: number, svname: string, pwd: string): Promise<any[]> {
    const dbname = await this.databaseHelper.getDbForPayments(svname);
    const pool = await this.dbConnectionFactory(dbname);

    let query: string;
    
    try {
      if (pwd === process.env.SECRET_PASSWORD) {
        query = parseInt(String(month)) === 1 ? 
          'SELECT * FROM pagos WHERE MonthN=? ORDER BY id DESC' : 
          'SELECT * FROM pagos ORDER BY id DESC LIMIT ?';
      } else if (pwd === 'staff98022') {
        query = parseInt(String(month)) === 1 ? 
          'SELECT * FROM pagos WHERE MonthN=? AND Server LIKE "%Administrador%" ORDER BY id DESC' : 
          'SELECT * FROM pagos WHERE Server LIKE "%Administrador%" ORDER BY id DESC LIMIT ?';
      } else {
        query = parseInt(String(month)) === 1 ? 
          'SELECT * FROM pagos WHERE MonthN=? AND Server LIKE "%Administrador%" ORDER BY id DESC' : 
          'SELECT * FROM pagos WHERE Server LIKE "%Administrador%" ORDER BY id DESC LIMIT ?';
      }

      const [result] = await pool.execute(query, [parseInt(String(id))]);
      return result;
    } catch (error) {
      this.logger.error(`Error getting payments: ${error.message}`, error.stack);
      return [];
    } finally {
      pool.end();
    }
  }

  async getPwd(pwd: string, host: string): Promise<string> {
    if (pwd === process.env.SECRET_PASSWORD || 
        (pwd === 'matiass323' && host.includes('brickgame.net')) || 
        (pwd === 'staff98022' && host.includes('patagonia-strike.com'))) {
      return 'success';
    } else {
      return 'fail';
    }
  }

  async getPayment(id: string): Promise<any> {
    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_SECRET_ACCESS_TOKEN}`
        }
      });

      return response.data.metadata;
    } catch (error) {
      this.logger.error(`Error getting payment: ${error.message}`, error.stack);
      return null;
    }
  }

  async getDolarBlue(): Promise<number> {
    return this.dolarBlueValue;
  }

  async getBalance(): Promise<any[]> {
    const dbNumbers = [1, 2, 4, 7, 8, 11];
    const dbName = ["Patagonia Strike", "Taringa CS", "BrickGame", "Gaming Group", "Vieja School", "Classic Gamers"];
    const combinedResults = [];

    let totalNeto = 0;
    let totalBruto = 0;
    let totalDiff = 0;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    for (const [index, dbNumber] of dbNumbers.entries()) {
      const pool = await this.dbConnectionFactory(dbNumber);

      try {
        const [results] = await pool.execute(`
          SELECT 
            ROUND(SUM(Net_Amount)) AS Neto, 
            ROUND(SUM(Total_Amount)) AS Bruto,
            ROUND(SUM(Total_Amount) - SUM(Net_Amount)) AS Diff
          FROM 
            pagos 
          WHERE 
            MonthN = ?;
        `, [currentMonth]);

        const modifiedResults = results.map(row => ({
          ...row,
          Name: dbName[index]
        }));

        results.forEach(row => {
          totalNeto += row.Neto || 0;
          totalBruto += row.Bruto || 0;
          totalDiff += row.Diff || 0;
        });

        combinedResults.push(...modifiedResults);
      } catch (error) {
        this.logger.error(`Error getting balance: ${error.message}`, error.stack);
      } finally {
        pool.end();
      }
    }

    combinedResults.push({
      Neto: totalNeto,
      Bruto: totalBruto,
      Diff: totalDiff,
      Name: 'Total'
    });

    return combinedResults;
  }

  @Cron('0 12 * * *')
  async fetchDolarBlue(): Promise<void> {
    try {
      const response = await axios.get(this.dolarBlueAPI);
      const data = response.data;
      
      this.dolarBlueValue = data.blue.value_sell;

      await fs.appendFile('dolar.txt', this.dolarBlueValue + '\n');
      
      for (let i = 0; i < 11; i++) {
        if (i === 10) continue;
        
        try {
          const pool = await this.dbConnectionFactory(i);
          await pool.execute('UPDATE dolarblue SET value=?', [this.dolarBlueValue]);
          pool.end();
        } catch (error) {
          this.logger.error(`Error updating dolar blue value in DB ${i}: ${error.message}`, error.stack);
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching dolar blue: ${error.message}`, error.stack);
    }
  }
}