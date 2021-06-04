import { Member } from "src/members/entities/member.entity";

export type LoginResult = {
  token: string;
  refreshToken: string;
  member:Member
};
