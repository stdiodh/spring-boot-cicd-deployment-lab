package com.andi.rest_crud

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest(properties = ["springdoc.swagger-ui.enabled=true"])
@AutoConfigureMockMvc
class RestCrudApplicationTests @Autowired constructor(
	private val mockMvc: MockMvc
) {

	@Test
	fun contextLoads() {
	}

	@Test
	fun `인증 없이 Swagger UI에 접근할 수 있다`() {
		mockMvc.perform(get("/swagger-ui/index.html"))
			.andExpect(status().isOk)
	}

}
