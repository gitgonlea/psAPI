import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DB_CONNECTION_FACTORY } from '../../database/database.providers';
import { DatabaseHelper } from '../../database/database.helper';
import { addDays, remainingDays } from '../../common/utils/date.utils';

@Injectable()
export class TopsService {
  private readonly logger = new Logger(TopsService.name);

  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
    private readonly databaseHelper: DatabaseHelper,
  ) {}

  @Cron('0 0 1 * *')
  async distributeMonthlyRewards() {
    const servers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11];
    
    for (const dbname of servers) {
      try {
        await this.giveRewards(dbname);
      } catch (error) {
        this.logger.error(`Error giving rewards for server ${dbname}: ${error.message}`, error.stack);
      }
    }
  }

  async giveRewards(dbname: number): Promise<void> {
    const pool = await this.dbConnectionFactory(dbname);

    try {
      const now = new Date();
      let previousMonthNumber = now.getMonth();
      previousMonthNumber += 1;
      
      const [checkResult] = await pool.execute(
        "SELECT COUNT(*) AS count FROM top_history WHERE Month = ?", 
        [previousMonthNumber]
      );
      
      if (checkResult[0].count > 0) {
        this.logger.log(`Rows with Month ${previousMonthNumber} already exist. Skipping insertion.`);
        return;
      }

      const [result] = await pool.execute(
        "SELECT Tag, Team, KnifePoints FROM publvl ORDER BY KnifePoints DESC LIMIT 50"
      );
      
      for (const row of result) {
        await pool.execute(
          "INSERT INTO top_history (Tag, Team, KnifePoints, Topid, Month) VALUES (?, ?, ?, ?, ?)",
          [row.Tag, row.Team, row.KnifePoints, 0, previousMonthNumber]
        );
      }

      const vipReward = [20, 15, 10, 8, 6, 4, 3, 2];

      for (let i = 0; i < 8; i++) {
        if (i >= result.length) break;
        
        const row = result[i];
        const expiration_date = addDays(new Date(), 31);

        const data = {
          username: row.Tag,
          expiration_date,
          days: 31,
          vip: vipReward[i],
          info: 'top_knife',
          payment_id: 0
        };

        await this.addVip(pool, data);
        
        await fs.appendFile(`${dbname}.txt`, JSON.stringify(data) + '\n');
      }

      await pool.execute("DELETE Status FROM top_monitor");

      this.logger.log(`Successfully distributed rewards for server ${dbname}`);
    } catch (error) {
      this.logger.error(`Error in giveRewards: ${error.message}`, error.stack);
    } finally {  
      pool.end();
    }
  }

  private async addVip(pool: any, data: any): Promise<{ success: boolean, errorMessage?: string }> {
    const dirPath = path.join(process.cwd(), 'vip_logs');
    const filePath = path.join(dirPath, `${data.username}.txt`);

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating vip_logs directory: ${error.message}`, error.stack);
    }
    
    let lastResult = null;
    let success = true;
    let errorMessage = null;
    let payment_id = data.payment_id;
  
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
            [data.username, data.vip, newDate, 0, data.info, payment_id]
          );
          lastResult = createVip;
        } else {
          newDate = '';
          const [createVip] = await pool.execute(
            'INSERT INTO vips (Tag, VIP, Date, Days, Info, Payment_ID) VALUES (?, ?, ?, ?, ?, ?)', 
            [data.username, data.vip, newDate, data.days, data.info, payment_id]
          );
          lastResult = createVip;
        }
      } else {
        const [createVip] = await pool.execute(
          'INSERT INTO vips (Tag, VIP, Date, Days, Info, Payment_ID) VALUES (?, ?, ?, ?, ?, ?)', 
          [data.username, data.vip, '', data.days, data.info, payment_id]
        );
        lastResult = createVip;
      }
    
      const [log_after_data] = await pool.execute('SELECT * FROM vips WHERE Tag=?', [data.username]);
  
      const previousDataString = JSON.stringify(log_previous_data, null, 2);
      const afterDataString = JSON.stringify(log_after_data, null, 2);
  
      await fs.appendFile(
        filePath, 
        `Before result:\n${previousDataString}\nAfter result:\n${afterDataString}\n`
      );
    } catch (error) {
      this.logger.error(`Error in addVip: ${error.message}`, error.stack);
      success = false;
      errorMessage = error.message;
    }

    return { success, errorMessage };
  }
}