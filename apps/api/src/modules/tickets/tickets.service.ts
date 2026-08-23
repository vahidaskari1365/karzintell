import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketMessage } from '../../database/entities';
import { paginate } from '../../common/utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly messages: Repository<TicketMessage>,
    private readonly notifications: NotificationsService,
  ) {}

  async myTickets(userId: number, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [items, total] = await this.tickets.findAndCount({
      where: { userId },
      order: { id: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return { items, total, page: p.page, limit: p.limit };
  }

  async myTicket(userId: number, id: number) {
    const ticket = await this.tickets.findOne({ where: { id, userId } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    const msgs = await this.messages.find({
      where: { ticketId: id },
      order: { id: 'ASC' },
    });
    return { ticket, messages: msgs.filter((m) => !m.isInternal) };
  }

  async create(userId: number, dto: { subject: string; department?: string; priority?: string; orderId?: number; body: string }) {
    const ticket = await this.tickets.save(
      this.tickets.create({
        userId,
        subject: dto.subject,
        department: (dto.department as any) || 'support',
        priority: (dto.priority as any) || 'medium',
        orderId: dto.orderId ?? null,
        status: 'open',
      }),
    );
    await this.messages.save(this.messages.create({ ticketId: ticket.id, senderId: userId, body: dto.body }));
    return this.myTicket(userId, ticket.id);
  }

  async reply(userId: number, id: number, body: string) {
    const ticket = await this.tickets.findOne({ where: { id, userId } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    await this.messages.save(this.messages.create({ ticketId: id, senderId: userId, body }));
    ticket.status = 'pending_support';
    await this.tickets.save(ticket);
    return this.myTicket(userId, id);
  }

  // ---------------------------------------------------------------- ادمین
  async adminList(query: { page?: string; limit?: string; status?: string }) {
    const p = paginate(query.page, query.limit);
    const qb = this.tickets
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id = t.user_id')
      .select(['t.*', 'u.full_name AS userName', 'u.phone AS userPhone'])
      .orderBy('t.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (query.status) qb.where('t.status = :st', { st: query.status });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.tickets.count(query.status ? { where: { status: query.status as any } } : {}),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async adminDetail(id: number) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    const messages = await this.messages.find({ where: { ticketId: id }, order: { id: 'ASC' } });
    return { ticket, messages };
  }

  async adminReply(id: number, adminId: number, body: string, isInternal: boolean) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    await this.messages.save(this.messages.create({ ticketId: id, senderId: adminId, body, isInternal }));
    if (!isInternal) {
      ticket.status = 'pending_customer';
      await this.tickets.save(ticket);
      await this.notifications.notify(ticket.userId, 'ticket.replied', 'پاسخ جدید به تیکت شما', `تیکت «${ticket.subject}» پاسخ داده شد.`, { ticketId: id });

      // ارسال پیامک پاسخ جدید به تیکت مشتری
      const user = await this.tickets.manager.createQueryBuilder()
        .select(['u.phone', 'u.fullName'])
        .from('users', 'u')
        .where('u.id = :id', { id: ticket.userId })
        .getRawOne();
      if (user?.u_phone) {
        const msg = `سلام ${user.u_fullName} عزیز\nتیکت پشتیبانی شما با عنوان «${ticket.subject}» پاسخ داده شد.\nکارزینتل\nkarzintell.ir/account/tickets`;
        await this.notifications.sendSms(user.u_phone, msg).catch(() => undefined);
      }
    }
    return this.adminDetail(id);
  }

  async adminSetStatus(id: number, status: Ticket['status']) {
    await this.tickets.update(id, { status, closedAt: status === 'closed' ? new Date() : null });
    return { updated: true };
  }
}
