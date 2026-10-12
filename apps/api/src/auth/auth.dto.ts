import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class LoginRequest {
  @IsString() @IsEmail() email: string;
  @IsString() password: string;
}
export class RegisterRequest extends LoginRequest {
  @IsString() @MinLength(8) password: string;
  @IsString() @Length(1, 30) nickname: string;
}
export class RefreshRequest {
  @IsString() refreshToken: string;
}
