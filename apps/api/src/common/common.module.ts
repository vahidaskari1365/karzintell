import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { AuditService } from "./audit.service";

@Global()
@Module({
  providers: [CacheService, AuditService],
  exports: [CacheService, AuditService],
})
export class CommonModule {}
