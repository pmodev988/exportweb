package dev.pmo.exportweb;
import java.util.*;
import org.apache.ibatis.annotations.*;
@Mapper interface InquiryMapper {
 @Select("select count(*) filter(where state='NEW') as pending, count(*) filter(where state<>'SPAM' and (created_at at time zone 'Asia/Tokyo')::date between #{from}::date and #{to}::date) as received, count(distinct company_id) filter(where state<>'SPAM' and (created_at at time zone 'Asia/Tokyo')::date between #{from}::date and #{to}::date) as companies from exportweb_inquiry where tenant_id=#{tenant} and org_id=#{org}") Map<String,Object> summary(long tenant,UUID org,String from,String to);
 @Select("select count(*) from exportweb_inquiry where tenant_id=#{tenant} and org_id=#{org} and client_hash=#{client} and created_at>now()-interval '1 hour'") int recentCount(long tenant,UUID org,String client);
 @Select("select * from exportweb_inquiry where tenant_id=#{tenant} and org_id=#{org} and id=#{id}") Map<String,Object> read(long tenant,UUID org,UUID id);
 @Insert("insert into exportweb_inquiry(tenant_id,org_id,id,company_id,host,sender_name,email,company_name,country,subject,message,digest,client_hash) values(#{tenant},#{org},#{id},#{companyId},#{host},#{name},#{email},#{company},#{country},#{subject},#{message},#{digest},#{client})") void insert(long tenant,UUID org,UUID id,String companyId,String host,String name,String email,String company,String country,String subject,String message,String digest,String client);
 @Select("select id,company_id,host,sender_name,email,company_name,country,subject,message,state,note,revision,created_at,updated_at from exportweb_inquiry where tenant_id=#{tenant} and org_id=#{org} order by created_at desc limit 50 offset #{offset}") List<Map<String,Object>> list(long tenant,UUID org,int offset);
 @Update("update exportweb_inquiry set state=#{state},note=#{note},revision=revision+1,updated_at=now() where tenant_id=#{tenant} and org_id=#{org} and id=#{id} and revision=#{revision}") int update(long tenant,UUID org,UUID id,long revision,String state,String note);
}
