import { MemberOnlineOutputUser } from "src/members/dto/ouput/member-online.ouput"
import { MEMBER_OFFLINE } from "../redis.pub-sub"

export class MemberOfflinePublish {
 [MEMBER_OFFLINE]:MemberOnlineOutputUser
}