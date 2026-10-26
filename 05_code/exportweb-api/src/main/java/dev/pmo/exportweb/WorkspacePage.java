package dev.pmo.exportweb;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller
class WorkspacePage {
 @GetMapping("/workspace") String redirect(){return "redirect:/workspace/";}
 @GetMapping("/workspace/") String index(){return "forward:/workspace/index.html";}
}
