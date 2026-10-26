package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.amqp.core.Queue;

class QueueConfigurationTest {
 @Test void realQueueConfigurationRegistersWithoutOverridingItsOwnBean(){
  try(var context=new AnnotationConfigApplicationContext()){
   context.setAllowBeanDefinitionOverriding(false);
   context.register(TaskQueue.class);
   context.refresh();
   assertNotNull(context.getBean(TaskQueue.class));
   var queues=context.getBeansOfType(Queue.class).values();
   assertEquals(2,queues.size());
   assertTrue(queues.stream().allMatch(Queue::isDurable));
   assertTrue(queues.stream().anyMatch(q->q.getName().equals("exportweb.business")));
   assertTrue(queues.stream().anyMatch(q->q.getName().equals("exportweb.business.failed")));
  }
 }
}
