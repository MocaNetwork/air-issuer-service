import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: Buffer<ArrayBuffer>;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = Buffer.from(configService.getOrThrow<string>('API_KEY'));
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  validateRequest(request: any): boolean {
    const key: string = request.headers?.['x-api-key'] ?? '';
    const actualKey = Buffer.from(key);

    if (actualKey.length !== this.apiKey.length) {
      timingSafeEqual(this.apiKey, this.apiKey);
      throw new ForbiddenException();
    }

    if (!timingSafeEqual(actualKey, this.apiKey)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
