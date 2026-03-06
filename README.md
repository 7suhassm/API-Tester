# API-Tester
API Tester is a lightweight Spring Boot project for creating and testing REST APIs. It demonstrates basic GET and POST endpoints, JSON request and response handling, and simple API communication. This project helps beginners understand how backend services work and how APIs interact with frontend applications.
#----
# API Tester (Simple Postman for Local Testing)

API Tester is a lightweight tool designed to test REST APIs running on a **local server**. It works like a **simplified version of Postman**, allowing developers to quickly send requests and view responses while building backend applications.

This project is useful for beginners who want to understand how **APIs communicate between frontend and backend** without installing heavy tools. It focuses on simplicity and quick local testing.

---

# What This Project Does

• Send **GET and POST API requests**
• Test APIs running on **localhost**
• View **JSON responses from backend servers**
• Useful for **Spring Boot API development testing**

Instead of using external tools, you can test APIs directly using this lightweight interface.

---

# About Spring Boot

Spring Boot is a powerful Java framework used to build **production-ready backend applications and REST APIs quickly**.

It simplifies backend development by providing:

• Embedded server (Tomcat)
• Auto configuration
• Easy REST API creation
• Minimal setup

With Spring Boot, you can build scalable backend services with very little configuration.

---

# Creating a Simple Spring Boot API

You can easily create a simple API using Spring Boot.

### Step 1 — Create a Spring Boot Project

You can create a project using:

• Spring Initializr
• Spring Boot IDE / STS
• IntelliJ IDEA

Basic configuration:

Project Type: **Maven**
Language: **Java**
Spring Boot: **Latest Stable Version**

Add dependency:

• **Spring Web**

After creating the project, your structure will look like:

```
src
 └─ main
     └─ java
         └─ com.example.demo
             └─ Controller
```

---

# Step 2 — Create Controller Class

Inside the **Controller** package, create a class called:

```
TestApi.java
```

Add the following code:

```java
package com.example.demo.Controller;

import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/demo")
public class TestApi {

    @GetMapping("/hello")
    public Map<String, String> hello() {

        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello Suhas! API is running successfully.");
        response.put("status", "OK");

        return response;
    }

    @PostMapping("/echo")
    public Map<String, Object> echo(@RequestBody Map<String, Object> payload) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("receivedData", payload);
        response.put("timestamp", System.currentTimeMillis());

        return response;
    }
}
```

---

# API Endpoints

### GET API

```
GET http://localhost:8080/api/demo/hello
```

Response:

```
{
  "message": "Hello Suhas! API is running successfully.",
  "status": "OK"
}
```

---

### POST API

```
POST http://localhost:8080/api/demo/echo
```

Request Body:

```
{
  "name": "Suhas",
  "role": "Developer"
}
```

Response:

```
{
  "status": "success",
  "receivedData": {
    "name": "Suhas",
    "role": "Developer"
  },
  "timestamp": 1710000000000
}
```

---

# How to Run the API

1. Run the **Spring Boot Application**
2. Server will start on:

```
http://localhost:8080
```

3. Use **API Tester** to send requests and view responses.

---

# Why This Project

This repository helps developers:

• Understand **how APIs work**
• Learn **Spring Boot REST development**
• Test **local APIs without Postman**
• Practice **frontend-backend integration**

---

# Contributing

Feel free to improve the project by adding:

• PUT / DELETE request support
• Headers support
• Authentication testing
• Response formatting

---

# Author

**Suhas SM**

Java Full Stack Developer | Spring Boot Enthusiast
