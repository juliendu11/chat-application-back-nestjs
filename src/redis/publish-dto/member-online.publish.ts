import { MemberOnlineOutputUser } from "src/members/dto/ouput/member-online.ouput"
import { MEMBER_ONLINE } from "../redis.pub-sub"

export class MemberOnlinePublish {
 [MEMBER_ONLINE]:MemberOnlineOutputUser
}