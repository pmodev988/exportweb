package dev.pmo.exportweb;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="EXPORTWEB_TEST_DATABASE_URL",matches="jdbc:postgresql://127.0.0.1:46[0-9]{3}/exportwebqa")
class PublicationMigrationTest {
 @Test void upgradingAnExistingPublicationPreservesContentAndOrganizationIsolation(){
  String url=System.getenv("EXPORTWEB_TEST_DATABASE_URL");
  // Replay historical schema upgrades in a dedicated local test database.
  String database="exportwebqa_upgrade_"+UUID.randomUUID().toString().replace("-","");
  new JdbcTemplate(new DriverManagerDataSource(url,"exportwebqa_super","")).execute("create database "+database+" owner exportwebqa_app");
  url=url.substring(0,url.lastIndexOf('/')+1)+database;
  var ds=new DriverManagerDataSource(url+(url.contains("?")?"&":"?")+"currentSchema=publication_upgrade",System.getenv("EXPORTWEB_TEST_DATABASE_USER"),System.getenv("EXPORTWEB_TEST_DATABASE_PASSWORD"));
  Flyway.configure().dataSource(ds).schemas("publication_upgrade").target("2").locations("classpath:db/migration").load().migrate();
  var jdbc=new JdbcTemplate(ds);var tx=new TransactionTemplate(new DataSourceTransactionManager(ds));var org=UUID.randomUUID();
  tx.execute(status->{
   jdbc.queryForObject("select set_config('exportweb.tenant_id','901',true)",String.class);jdbc.queryForObject("select set_config('exportweb.org_id',?,true)",String.class,org.toString());
   jdbc.update("insert into exportweb_publication(tenant_id,org_id,revision,document,host) values(901,?,7,'{\"kept\":true}'::jsonb,'before.example.test')",org);return null;
  });
  Flyway.configure().dataSource(ds).schemas("publication_upgrade").locations("classpath:db/migration").load().migrate();
  tx.execute(status->{
   jdbc.queryForObject("select set_config('exportweb.tenant_id','901',true)",String.class);jdbc.queryForObject("select set_config('exportweb.org_id',?,true)",String.class,org.toString());
   assertEquals(7,jdbc.queryForObject("select revision from exportweb_publication where host='before.example.test'",Integer.class));assertEquals("true",jdbc.queryForObject("select document->>'kept' from exportweb_publication",String.class));
   jdbc.update("insert into exportweb_publication(tenant_id,org_id,revision,document,host) values(901,?,8,'{}'::jsonb,'after.example.test')",org);
   assertEquals(2,jdbc.queryForObject("select count(*) from exportweb_publication",Integer.class));
   jdbc.queryForObject("select set_config('exportweb.org_id',?,true)",String.class,UUID.randomUUID().toString());assertEquals(0,jdbc.queryForObject("select count(*) from exportweb_publication",Integer.class));return null;
  });
 }
}
