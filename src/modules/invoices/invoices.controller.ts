import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { NotifyPaymentDto } from './dto/notify-payment.dto';
import { Request } from 'express';

@ApiTags('invoices')
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('createinvoice')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Create a new invoice for VIP purchase' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ type: CreateInvoiceDto })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(createInvoiceDto);
  }

  @Get('getblue')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get current dolar blue value' })
  @ApiResponse({ status: 200, description: 'Returns current dolar blue value' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getDolarBlue() {
    return this.invoicesService.getDolarBlue();
  }

  @Get('getusernamelist/:id/:svname/:svnum')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get username list by IP address' })
  @ApiResponse({ status: 200, description: 'Returns list of usernames' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiParam({ name: 'id', description: 'IP address' })
  @ApiParam({ name: 'svname', description: 'Server name' })
  @ApiParam({ name: 'svnum', description: 'Server number' })
  async getUsernameList(
    @Param('id') id: string,
    @Param('svname') svname: string,
    @Param('svnum') svnum: string,
  ) {
    return this.invoicesService.getUsernameList(id, svname, parseInt(svnum, 10));
  }

  @Get('getpwd')
  @ApiOperation({ summary: 'Verify password' })
  @ApiResponse({ status: 200, description: 'Returns success or fail' })
  @ApiQuery({ name: 'pwd', description: 'Password to verify' })
  async getPwd(@Query('pwd') pwd: string, @Req() req: Request) {
    const host = req.get('Referer') || '';
    return this.invoicesService.getPwd(pwd, host);
  }

  @Post('notify')
  @ApiOperation({ summary: 'Handle payment notification from MercadoPago' })
  @ApiResponse({ status: 200, description: 'Notification processed' })
  @HttpCode(HttpStatus.OK)
  async notify(@Query('id') id: string, @Query('svname') svname: string, @Query('svnum') svnum: string) {
    const parsedSvnum = svnum ? parseInt(svnum, 10) : 0;
    
    const notifyData = {
      id,
      svname,
      svnum: isNaN(parsedSvnum) ? 0 : parsedSvnum
    };
    
    return this.invoicesService.notify(notifyData);
  }
  @Get('getpayments/:month/:id/:svname/:pwd')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get payments for server' })
  @ApiResponse({ status: 200, description: 'Returns payment list' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiParam({ name: 'month', description: 'Month filter (1 for current month, 0 for all)' })
  @ApiParam({ name: 'id', description: 'Limit for results if month=0, or month number if month=1' })
  @ApiParam({ name: 'svname', description: 'Server name' })
  @ApiParam({ name: 'pwd', description: 'Admin password' })
  async getPayments(
    @Param('month') month: string,
    @Param('id') id: string,
    @Param('svname') svname: string,
    @Param('pwd') pwd: string,
  ) {
    return this.invoicesService.getPayments(parseInt(month, 10), parseInt(id, 10), svname, pwd);
  }

  @Get('getpayment')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Returns payment data' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiQuery({ name: 'id', description: 'MercadoPago payment ID' })
  async getPayment(@Query('id') id: string) {
    return this.invoicesService.getPayment(id);
  }

  @Get('getBalance')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get balance for all servers' })
  @ApiResponse({ status: 200, description: 'Returns balance data' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getBalance() {
    return this.invoicesService.getBalance();
  }
}