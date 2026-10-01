import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingMethod, ShippingZone, SHIPPING_METHOD_TYPE_LABELS } from '../../database/entities';
import { SettingsService } from '../settings/settings.service';
import { DomainException } from '../../common/http-exception.filter';

export interface ResolvedMethod {
  id: number;
  name: string;
  type: string;
  typeLabel: string;
  eta: string | null;
  cost: number;
  finalCost: number; // بعد از قانون ارسال رایگان
  isFree: boolean;
  zoneName: string;
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShippingZone) private readonly zones: Repository<ShippingZone>,
    @InjectRepository(ShippingMethod) private readonly methods: Repository<ShippingMethod>,
    private readonly settings: SettingsService,
  ) {}

  /** منطقه منطبق بر استان/شهر — اولویت با sort_order کم‌تر، سپس منطقه پیش‌فرض (provinces NULL) */
  private matchZone(all: ShippingZone[], province?: string, city?: string): ShippingZone | null {
    const norm = (s?: string | null) => (s || '').trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    const p = norm(province);
    const c = norm(city);
    const active = all.filter((z) => z.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    // ۱) تطابق دقیق شهر
    if (c) {
      const byCity = active.find(
        (z) => Array.isArray(z.cities) && z.cities.map(norm).includes(c)
          && (!Array.isArray(z.provinces) || !p || z.provinces.map(norm).includes(p)),
      );
      if (byCity) return byCity;
    }
    // ۲) تطابق استان
    if (p) {
      const byProvince = active.find(
        (z) => Array.isArray(z.provinces) && z.provinces.map(norm).includes(p)
          && (!Array.isArray(z.cities) || !c || z.cities.map(norm).includes(c)),
      );
      if (byProvince) return byProvince;
    }
    // ۳) منطقه پیش‌فرض (کشوری)
    return active.find((z) => z.provinces == null) ?? null;
  }

  /** روش‌های ارسال قابل استفاده برای مقصد + مبلغ سبد */
  async methodsFor(province: string | undefined, city: string | undefined, subtotal: number) {
    const all = await this.zones.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    const zone = this.matchZone(all, province, city);
    if (!zone) return { zone: null as string | null, items: [] as ResolvedMethod[] };

    const freeOver = Number(await this.settings.get('store.free_shipping_threshold', 0)) || 0;
    const methods = await this.methods.find({ where: { zoneId: zone.id, isActive: true }, order: { sortOrder: 'ASC', id: 'ASC' } });

    const items: ResolvedMethod[] = methods.map((m) => {
      const free = (freeOver > 0 && subtotal >= freeOver) || (m.freeAbove != null && subtotal >= m.freeAbove);
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        typeLabel: SHIPPING_METHOD_TYPE_LABELS[m.type],
        eta: m.eta,
        cost: m.cost,
        finalCost: free ? 0 : m.cost,
        isFree: free,
        zoneName: zone.name,
      };
    });
    return { zone: zone.name, items };
  }

  /** حل نهایی روش ارسال در چک‌اوت (سمت سرور — امن در برابر دست‌کاری قیمت) */
  async resolveForCheckout(methodId: number, province: string, city: string, payable: number) {
    const method = await this.methods.findOne({ where: { id: methodId, isActive: true } });
    if (!method) throw new DomainException('SHIPPING_METHOD_INVALID', 'روش ارسال انتخاب‌شده معتبر نیست', 400);
    const zone = await this.zones.findOne({ where: { id: method.zoneId, isActive: true } });
    if (!zone) throw new DomainException('SHIPPING_METHOD_INVALID', 'روش ارسال برای منطقه شما فعال نیست', 400);

    const freeOver = Number(await this.settings.get('store.free_shipping_threshold', 0)) || 0;
    const free = (freeOver > 0 && payable >= freeOver) || (method.freeAbove != null && payable >= method.freeAbove);
    return { method, zone, cost: free ? 0 : method.cost };
  }

  // ---------------------------------------------------------------- ادمین
  async adminZones() {
    const zones = await this.zones.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    const methods = await this.methods.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return zones.map((z) => ({ ...z, methods: methods.filter((m) => m.zoneId === z.id) }));
  }

  async saveZone(dto: Partial<ShippingZone> & { id?: number }) {
    if (dto.id) {
      await this.zones.update(dto.id, {
        name: dto.name, provinces: dto.provinces ?? null, cities: dto.cities ?? null,
        isActive: dto.isActive ?? true, sortOrder: dto.sortOrder ?? 0,
      } as any);
      return this.zones.findOne({ where: { id: dto.id } });
    }
    return this.zones.save(
      this.zones.create({
        name: dto.name || 'منطقه جدید',
        provinces: dto.provinces ?? null,
        cities: dto.cities ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async removeZone(id: number) {
    await this.methods.delete({ zoneId: id });
    await this.zones.delete(id);
    return { deleted: true };
  }

  async saveMethod(dto: Partial<ShippingMethod> & { id?: number; zoneId?: number }) {
    if (dto.id) {
      const existing = await this.methods.findOne({ where: { id: dto.id } });
      if (!existing) throw new NotFoundException('روش ارسال یافت نشد');
      await this.methods.update(dto.id, {
        zoneId: dto.zoneId ?? existing.zoneId,
        name: dto.name ?? existing.name,
        type: dto.type ?? existing.type,
        cost: dto.cost ?? existing.cost,
        freeAbove: dto.freeAbove !== undefined ? dto.freeAbove : existing.freeAbove,
        eta: dto.eta !== undefined ? dto.eta : existing.eta,
        isActive: dto.isActive ?? existing.isActive,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      } as any);
      return this.methods.findOne({ where: { id: dto.id } });
    }
    if (!dto.zoneId) throw new DomainException('BAD_REQUEST', 'منطقه الزامی است', 400);
    const zone = await this.zones.findOne({ where: { id: dto.zoneId } });
    if (!zone) throw new NotFoundException('منطقه یافت نشد');
    return this.methods.save(
      this.methods.create({
        zoneId: dto.zoneId,
        name: dto.name || 'روش جدید',
        type: dto.type ?? 'post',
        cost: dto.cost ?? 0,
        freeAbove: dto.freeAbove ?? null,
        eta: dto.eta ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async removeMethod(id: number) {
    await this.methods.delete(id);
    return { deleted: true };
  }
}
