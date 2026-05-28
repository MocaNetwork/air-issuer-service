import { repl } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await repl(AppModule);
  app.setupHistory('.node_repl_history', () => undefined);
}
bootstrap();
