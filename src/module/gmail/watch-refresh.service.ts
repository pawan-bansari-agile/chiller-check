import { Injectable, Logger } from "@nestjs/common";
import { GmailService } from "./gmail.service";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class WatchRefreshService {
  private readonly logger = new Logger(WatchRefreshService.name);

  constructor(private readonly gmailService: GmailService) {}

  @Cron("0 0 */7 * *")
  async refreshWatch() {
    this.logger.log("Refreshing Gmail watch directly...");
    await this.gmailService.watchInbox(); // 👈 call method directly
    this.logger.log("Watch refreshed.");
  }
}
