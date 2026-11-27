import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  revenueTransactions, 
  RevenueTransaction,
  revenueConfig,
  RevenueConfig
} from '../data';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

@Injectable()
export class RevenueService {
  
  // ================= CONFIGURATION =================
  getConfig() {
    return revenueConfig;
  }

  updateConfig(key_name: string, value: number) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new BadRequestException('Config value must be a valid finite number');
    }
    if (value < 0 || value > 100) {
      throw new BadRequestException('Config value must be between 0 and 100');
    }
    const config = revenueConfig.find(c => c.key_name === key_name);
    if (!config) {
      throw new NotFoundException(`Config key ${key_name} not found`);
    }
    config.value_number = value;
    return config;
  }

  getConfigValue(key_name: string): number {
    const config = revenueConfig.find(c => c.key_name === key_name);
    return config?.value_number || 0;
  }

  // ================= CALCULATION =================
  
  calculateBookingCommission(bookingRef: number, amount: number) {
    const rate = this.getConfigValue('DEFAULT_BOOKING_COMMISSION');
    const commission = (amount * rate) / 100;
    
    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'BOOKING_COMMISSION',
      booking_reference: bookingRef,
      gross_amount: amount,
      commission_rate: rate,
      revenue_amount: commission,
      payout_amount: amount - commission,
      currency: 'INR',
      status: 'EARNED',
      agency_id: null,
      guide_id: null,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: null
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  calculateAgencyCommission(bookingRef: number, amount: number, agencyId: number, customRate?: number) {
    const rate = customRate ?? this.getConfigValue('DEFAULT_AGENCY_COMMISSION');
    const commission = (amount * rate) / 100;

    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'AGENCY_COMMISSION',
      booking_reference: bookingRef,
      gross_amount: amount,
      commission_rate: rate,
      revenue_amount: commission,
      payout_amount: amount - commission,
      currency: 'INR',
      status: 'EARNED',
      agency_id: agencyId,
      guide_id: null,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: null
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  calculateGuideCommission(bookingRef: number, amount: number, guideId: number) {
    const rate = this.getConfigValue('DEFAULT_GUIDE_COMMISSION');
    const commission = (amount * rate) / 100;

    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'GUIDE_COMMISSION',
      booking_reference: bookingRef,
      gross_amount: amount,
      commission_rate: rate,
      revenue_amount: commission,
      payout_amount: amount - commission,
      currency: 'INR',
      status: 'EARNED',
      agency_id: null,
      guide_id: guideId,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: null
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  calculateProviderCommission(bookingRef: number, amount: number, providerId: number) {
    const rate = this.getConfigValue('DEFAULT_PROVIDER_COMMISSION');
    const commission = (amount * rate) / 100;

    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'PROVIDER_COMMISSION',
      booking_reference: bookingRef,
      gross_amount: amount,
      commission_rate: rate,
      revenue_amount: commission,
      payout_amount: amount - commission,
      currency: 'INR',
      status: 'EARNED',
      agency_id: null,
      guide_id: null,
      provider_id: providerId,
      created_at: new Date().toISOString(),
      settled_at: null
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  recordPackageMarkup(bookingRef: number, amount: number, markupPercentage: number) {
    const commission = (amount * markupPercentage) / 100;

    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'PACKAGE_MARKUP',
      booking_reference: bookingRef,
      gross_amount: amount,
      commission_rate: markupPercentage,
      revenue_amount: commission,
      payout_amount: amount - commission,
      currency: 'INR',
      status: 'EARNED',
      agency_id: null,
      guide_id: null,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: null
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  recordSubscriptionRevenue(agencyId: number, planId: number, amount: number) {
    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'SUBSCRIPTION',
      booking_reference: null,
      gross_amount: amount,
      commission_rate: null,
      revenue_amount: amount,
      payout_amount: 0,
      currency: 'INR',
      status: 'SETTLED',
      agency_id: agencyId,
      guide_id: null,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  recordPromotionRevenue(agencyId: number, packageId: number, amount: number) {
    const newTx: RevenueTransaction = {
      transaction_id: revenueTransactions.length + 1,
      revenue_type: 'FEATURED_LISTING',
      booking_reference: null,
      gross_amount: amount,
      commission_rate: null,
      revenue_amount: amount,
      payout_amount: 0,
      currency: 'INR',
      status: 'SETTLED',
      agency_id: agencyId,
      guide_id: null,
      provider_id: null,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    
    revenueTransactions.push(newTx);
    return newTx;
  }

  refundRevenue(bookingRef: number) {
    const txs = revenueTransactions.filter(t => t.booking_reference === bookingRef);
    txs.forEach(t => {
      t.status = 'REFUNDED';
    });
    return txs;
  }

  // ================= QUERIES =================
  
  getAllTransactions(): RevenueTransaction[];
  getAllTransactions(query: PaginationQueryDto): RevenueTransaction[] | PaginatedResult<RevenueTransaction>;
  getAllTransactions(query?: PaginationQueryDto): any {
    return paginateCollection(revenueTransactions, query, ['revenue_type', 'currency']);
  }

  getAgencyTransactions(agencyId: number, query?: PaginationQueryDto): RevenueTransaction[] | PaginatedResult<RevenueTransaction> {
    const list = revenueTransactions.filter(t => t.agency_id === agencyId);
    return paginateCollection(list, query, ['revenue_type', 'currency']);
  }

  /**
   * Settled Revenue Analytics computed ONLY from settled transactions / ledger entries with date filters.
   * Strictly returns ZERO when there is no settled data.
   */
  getSettledRevenueAnalytics(startDate?: string, endDate?: string) {
    let settledTxs = revenueTransactions.filter(t => t.status === 'SETTLED');

    if (startDate) {
      const start = new Date(startDate).getTime();
      settledTxs = settledTxs.filter(t => new Date(t.settled_at || t.created_at).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      settledTxs = settledTxs.filter(t => new Date(t.settled_at || t.created_at).getTime() <= end);
    }

    if (settledTxs.length === 0) {
      return {
        totalSettledRevenue: 0,
        grossBookingValue: 0,
        totalPayouts: 0,
        settledCount: 0,
        averageRevenue: 0,
        monthlyTrend: [],
        breakdown: {
          BOOKING_COMMISSION: 0,
          AGENCY_COMMISSION: 0,
          GUIDE_COMMISSION: 0,
          PROVIDER_COMMISSION: 0,
          PACKAGE_MARKUP: 0,
          SUBSCRIPTION: 0,
          FEATURED_LISTING: 0,
        },
        transactions: [],
      };
    }

    let totalSettledRevenue = 0;
    let grossBookingValue = 0;
    let totalPayouts = 0;
    const breakdown = {
      BOOKING_COMMISSION: 0,
      AGENCY_COMMISSION: 0,
      GUIDE_COMMISSION: 0,
      PROVIDER_COMMISSION: 0,
      PACKAGE_MARKUP: 0,
      SUBSCRIPTION: 0,
      FEATURED_LISTING: 0,
    };

    const monthMap = new Map<string, number>();

    settledTxs.forEach(t => {
      totalSettledRevenue += t.revenue_amount || 0;
      grossBookingValue += t.gross_amount || 0;
      totalPayouts += t.payout_amount || 0;
      if (breakdown[t.revenue_type] !== undefined) {
        breakdown[t.revenue_type] += t.revenue_amount;
      }
      const d = new Date(t.settled_at || t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + (t.revenue_amount || 0));
    });

    const monthlyTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, revenue]) => ({ period, revenue }));

    return {
      totalSettledRevenue,
      grossBookingValue,
      totalPayouts,
      settledCount: settledTxs.length,
      averageRevenue: Math.round((totalSettledRevenue / settledTxs.length) * 100) / 100,
      monthlyTrend,
      breakdown,
      transactions: settledTxs,
    };
  }

  getRevenueSummary() {
    const validStatuses = ['EARNED', 'SETTLED'];
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let settledRevenue = 0;
    let thisMonthRevenue = 0;
    let thisYearRevenue = 0;
    let grossBookingValue = 0;
    let totalPayouts = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Initialize last 6 months trend array
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyTrend.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        revenue: 0,
        monthIndex: d.getMonth(),
        breakdown: {
          BOOKING_COMMISSION: 0,
          AGENCY_COMMISSION: 0,
          SUBSCRIPTION: 0,
          FEATURED_LISTING: 0
        }
      });
    }

    revenueTransactions.forEach(t => {
      if (validStatuses.includes(t.status)) {
        totalRevenue += t.revenue_amount;
        grossBookingValue += t.gross_amount || 0;
        totalPayouts += t.payout_amount || 0;
        
        const txDate = new Date(t.created_at);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          thisMonthRevenue += t.revenue_amount;
        }
        if (txDate.getFullYear() === currentYear) {
          thisYearRevenue += t.revenue_amount;
        }

        // Add to monthly trend if within last 6 months
        const trendItem = monthlyTrend.find(m => m.monthIndex === txDate.getMonth() && m.year === txDate.getFullYear());
        if (trendItem) {
          trendItem.revenue += t.revenue_amount;
          if (trendItem.breakdown[t.revenue_type] !== undefined) {
            trendItem.breakdown[t.revenue_type] += t.revenue_amount;
          } else {
            trendItem.breakdown.BOOKING_COMMISSION += t.revenue_amount;
          }
        }
      }
      
      if (t.status === 'PENDING' || t.status === 'EARNED') {
         pendingRevenue += t.revenue_amount;
      }
      if (t.status === 'SETTLED') {
         settledRevenue += t.revenue_amount;
      }
    });

    const netProfitMargin = grossBookingValue > 0 ? (totalRevenue / grossBookingValue) * 100 : 0;

    return {
      totalRevenue,
      thisMonthRevenue,
      thisYearRevenue,
      pendingRevenue,
      settledRevenue,
      grossBookingValue,
      totalPayouts,
      netProfitMargin: netProfitMargin.toFixed(2),
      monthlyTrend,
      totalBookings: revenueTransactions.filter(t => t.booking_reference !== null).length,
      breakdown: this.getBreakdown()
    };
  }

  getBreakdown() {
    const validStatuses = ['EARNED', 'SETTLED'];
    const breakdown = {
      BOOKING_COMMISSION: 0,
      AGENCY_COMMISSION: 0,
      GUIDE_COMMISSION: 0,
      PROVIDER_COMMISSION: 0,
      PACKAGE_MARKUP: 0,
      SUBSCRIPTION: 0,
      FEATURED_LISTING: 0,
    };

    revenueTransactions.forEach(t => {
      if (validStatuses.includes(t.status) && breakdown[t.revenue_type] !== undefined) {
        breakdown[t.revenue_type] += t.revenue_amount;
      }
    });
    
    return breakdown;
  }
}
