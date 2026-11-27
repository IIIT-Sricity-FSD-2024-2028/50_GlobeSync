import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ManualInventoryProviderAdapter } from './adapters/manual-inventory-provider.adapter';

@Module({
  providers: [ManualInventoryProviderAdapter, InventoryService],
  exports: [InventoryService, ManualInventoryProviderAdapter],
})
export class InventoryModule {}
