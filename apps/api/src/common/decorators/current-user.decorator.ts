import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user) return null;
    return data ? user[data] : user;
  },
);
