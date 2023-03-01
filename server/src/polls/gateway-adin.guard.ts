import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class GatewayAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>  {
    throw new Error("Method not implemented.");
  }
}