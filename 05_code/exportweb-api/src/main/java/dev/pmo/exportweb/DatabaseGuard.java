package dev.pmo.exportweb;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component
class DatabaseGuard implements ApplicationRunner {
 private final JdbcTemplate jdbc;DatabaseGuard(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public void run(ApplicationArguments args){
  if(Boolean.TRUE.equals(jdbc.queryForObject("select rolsuper or rolbypassrls from pg_roles where rolname=current_user",Boolean.class)))throw new IllegalStateException("ExportWeb 运行数据库账号不得绕过行级隔离");
  if(jdbc.queryForObject("select current_setting('server_version_num')::int / 10000",Integer.class)!=18)throw new IllegalStateException("ExportWeb 需要 PostgreSQL 18");
 }
}
