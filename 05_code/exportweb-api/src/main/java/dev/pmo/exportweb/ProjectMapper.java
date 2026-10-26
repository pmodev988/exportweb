package dev.pmo.exportweb;
import java.util.*;
import org.apache.ibatis.annotations.*;
@Mapper
interface ProjectMapper {
 @Select("select set_config('exportweb.tenant_id',#{tenant}::text,true),set_config('exportweb.org_id',#{org}::text,true)") Map<String,Object> scope(long tenant,UUID org);
 @Insert("insert into exportweb_project(tenant_id,org_id,document) values(#{tenant},#{org},#{document}::jsonb) on conflict do nothing") void create(long tenant,UUID org,String document);
 @Select("select revision,document::text from exportweb_project where tenant_id=#{tenant} and org_id=#{org}") Map<String,Object> read(long tenant,UUID org);
 @Update("update exportweb_project set document=#{document}::jsonb,revision=revision+1,updated_at=now() where tenant_id=#{tenant} and org_id=#{org} and revision=#{expected}") int save(long tenant,UUID org,long expected,String document);
 @Insert("insert into exportweb_revision(tenant_id,org_id,revision,document) values(#{tenant},#{org},#{revision},#{document}::jsonb)") void version(long tenant,UUID org,long revision,String document);
 @Select("select revision,host,document::text from exportweb_publication where tenant_id=#{tenant} and org_id=#{org} and host=#{host}") Map<String,Object> published(long tenant,UUID org,String host);
 @Insert("insert into exportweb_publication(tenant_id,org_id,revision,document,host) values(#{tenant},#{org},#{revision},#{document}::jsonb,#{host}) on conflict(tenant_id,org_id,host) do update set revision=excluded.revision,document=excluded.document,published_at=now()") void publish(long tenant,UUID org,long revision,String document,String host);
 @Select("select revision from exportweb_project where tenant_id=#{tenant} and org_id=#{org} for update") Long lock(long tenant,UUID org);
 @Insert("insert into exportweb_asset(tenant_id,org_id,id,media_type,object_key,byte_size) values(#{tenant},#{org},#{id},#{type},#{key},#{size})") void asset(long tenant,UUID org,UUID id,String type,String key,long size);
 @Select("select media_type,object_key,byte_size from exportweb_asset where tenant_id=#{tenant} and org_id=#{org} and id=#{id}") Map<String,Object> assetRead(long tenant,UUID org,UUID id);
 @Select("select id,object_key from exportweb_asset where tenant_id=#{tenant} and org_id=#{org} and site_id=#{site} and file_name=#{name} for update") Map<String,Object> namedAsset(long tenant,UUID org,String site,String name);
 @Update("update exportweb_asset set media_type=#{type},byte_size=#{size},site_id=#{site},file_name=#{name} where tenant_id=#{tenant} and org_id=#{org} and id=#{id}") int nameAsset(long tenant,UUID org,UUID id,String site,String name,String type,long size);
 @Select("select coalesce(max(version_no),0)+1 from exportweb_website_version where tenant_id=#{tenant} and org_id=#{org} and site_id=#{site}") long nextWebsiteVersion(long tenant,UUID org,String site);
 @Insert("insert into exportweb_website_version(tenant_id,org_id,site_id,version_no,source_revision,document,note) values(#{tenant},#{org},#{site},#{number},#{revision},#{document}::jsonb,#{note})") void websiteVersion(long tenant,UUID org,String site,long number,long revision,String document,String note);
 @Select("select version_no,source_revision,note,created_at from exportweb_website_version where tenant_id=#{tenant} and org_id=#{org} and site_id=#{site} order by version_no desc limit 50 offset #{offset}") List<Map<String,Object>> websiteVersions(long tenant,UUID org,String site,int offset);
 @Select("select version_no,source_revision,note,created_at,document::text from exportweb_website_version where tenant_id=#{tenant} and org_id=#{org} and site_id=#{site} and version_no=#{number}") Map<String,Object> websiteVersionRead(long tenant,UUID org,String site,long number);
}
