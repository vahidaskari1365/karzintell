import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void): void {
    req.id = (req.headers["x-request-id"] as string) || randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  }
}
