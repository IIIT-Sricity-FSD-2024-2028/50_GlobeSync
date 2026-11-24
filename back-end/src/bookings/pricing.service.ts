import { Injectable, BadRequestException } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { guides, packages } from '../data';
import { testDb } from '../database/test-database';

export interface PriceItemInput {
  inventoryRef: string;
  quantity: number;
}

export interface PriceCalculationParams {
  items?: PriceItemInput[];
  guideId?: number;
  startDate?: string;
  endDate?: string;
  packageId?: number;
  transportMode?: string;
  cancellationProtectionSelected?: boolean;
}

export interface PriceBreakdownItem {
  inventoryRef: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  totalMinor: number;
}

export interface CalculatedPrice {
  items: PriceBreakdownItem[];
  itemsSubtotalMinor: number;
  guideSubtotalMinor: number;
  guideDays: number;
  guideDailyRateMinor: number;
  packageSubtotalMinor: number;
  baseSubtotalMinor: number;
  taxRatePercent: number;
  taxesMinor: number;
  insuranceMinor: number;
  cancellationProtectionFeeMinor: number;
  totalMinor: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class PricingService {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Compute authoritative pricing server-side.
   * Completely ignores any client-supplied 'amount', 'total', or 'price'.
   */
  calculatePrice(params: PriceCalculationParams): CalculatedPrice {
    let itemsSubtotalMinor = 0;
    const breakdownItems: PriceBreakdownItem[] = [];

    // 1. Calculate Inventory Items Subtotal
    if (params.items && Array.isArray(params.items)) {
      for (const itemInput of params.items) {
        if (!itemInput.inventoryRef || itemInput.quantity <= 0) continue;
        const inv = this.inventoryService.findByRef(itemInput.inventoryRef);
        if (!inv) {
          throw new BadRequestException(`Unknown inventory item reference: '${itemInput.inventoryRef}'`);
        }
        const itemTotal = inv.priceMinor * itemInput.quantity;
        itemsSubtotalMinor += itemTotal;
        breakdownItems.push({
          inventoryRef: inv.inventoryRef,
          name: inv.name,
          unitPriceMinor: inv.priceMinor,
          quantity: itemInput.quantity,
          totalMinor: itemTotal,
        });
      }
    }

    // 2. Calculate Guide Subtotal
    let guideSubtotalMinor = 0;
    let guideDays = 0;
    let guideDailyRateMinor = 0;

    if (params.guideId) {
      // Find guide profile in testDb or guides data
      const guideProfile = (testDb.guideProfiles || []).find((p: any) => p.user_id === params.guideId || p.id === params.guideId);
      const guideData = guides.find((g: any) => g.guideId === params.guideId || g.id === params.guideId);

      guideDailyRateMinor = guideProfile?.admin_set_rate_minor
        ?? guideData?.adminSetRateMinor
        ?? (guideData?.pricePerTrip ? Math.round(guideData.pricePerTrip * 100) : 250000); // default ₹2,500.00 / day

      if (params.startDate && params.endDate) {
        const start = new Date(params.startDate).getTime();
        const end = new Date(params.endDate).getTime();
        const diffMs = Math.max(0, end - start);
        guideDays = Math.max(1, Math.round(diffMs / (24 * 3600 * 1000)));
      } else {
        guideDays = 1;
      }

      guideSubtotalMinor = guideDailyRateMinor * guideDays;
    }

    // 3. Calculate Package Subtotal
    let packageSubtotalMinor = 0;
    if (params.packageId) {
      const pkg = packages.find((p: any) => p.packageId === params.packageId || p.id === params.packageId);
      if (pkg) {
        packageSubtotalMinor = Math.round((pkg.budget || 0) * 100);
      }
    }

    const baseSubtotalMinor = itemsSubtotalMinor + guideSubtotalMinor + packageSubtotalMinor;

    // 4. Compulsory Travel Insurance (7% if transport mode specified)
    let insuranceMinor = 0;
    if (params.transportMode) {
      insuranceMinor = Math.round(baseSubtotalMinor * 0.07);
    }

    // 5. Cancellation Protection Fee
    let cancellationProtectionFeeMinor = 0;
    if (params.cancellationProtectionSelected) {
      if (params.transportMode === 'Flight') cancellationProtectionFeeMinor = 10000; // ₹100.00
      else if (params.transportMode === 'Bus') cancellationProtectionFeeMinor = 7000; // ₹70.00
      else if (params.transportMode === 'Train') cancellationProtectionFeeMinor = 5000; // ₹50.00
      else cancellationProtectionFeeMinor = 10000; // ₹100.00
    }

    // 6. Taxes (GST 5% standard on travel services)
    const taxRatePercent = 5;
    const taxesMinor = Math.round(baseSubtotalMinor * (taxRatePercent / 100));

    // 7. Authoritative Total
    const totalMinor = baseSubtotalMinor + taxesMinor + insuranceMinor + cancellationProtectionFeeMinor;

    return {
      items: breakdownItems,
      itemsSubtotalMinor,
      guideSubtotalMinor,
      guideDays,
      guideDailyRateMinor,
      packageSubtotalMinor,
      baseSubtotalMinor,
      taxRatePercent,
      taxesMinor,
      insuranceMinor,
      cancellationProtectionFeeMinor,
      totalMinor,
      totalAmount: totalMinor / 100,
      currency: 'INR',
    };
  }
}
