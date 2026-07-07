package com.example.backend.controller;

import com.example.backend.entity.Room;
import com.example.backend.repository.RoomRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blueprint")
public class BlueprintController {

    private final RoomRepository roomRepository;
    private final RestTemplate restTemplate;

    public BlueprintController(RoomRepository roomRepository, RestTemplate restTemplate) {
        this.roomRepository = roomRepository;
        this.restTemplate = restTemplate;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<Room>> uploadBlueprint(@RequestParam("image") MultipartFile image) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new org.springframework.core.io.ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return image.getOriginalFilename();
                }
            });

            Map<String, Object> response = restTemplate.postForObject(
                    "http://localhost:8000/api/ai/generate-blueprint",
                    body,
                    Map.class
            );

            List<Room> savedRooms = new ArrayList<>();
            if (response != null && response.containsKey("rooms")) {
                List<?> rooms = (List<?>) response.get("rooms");
                for (Object rawRoom : rooms) {
                    LinkedHashMap<?, ?> roomMap = (LinkedHashMap<?, ?>) rawRoom;
                    Room room = new Room();
                    room.setName(String.valueOf(roomMap.get("name")));

                    LinkedHashMap<?, ?> bbox = (LinkedHashMap<?, ?>) roomMap.get("bbox");
                    room.setX1(((Number) bbox.get("x")).intValue());
                    room.setY1(((Number) bbox.get("y")).intValue());
                    room.setX2(((Number) bbox.get("x")).intValue() + ((Number) bbox.get("width")).intValue());
                    room.setY2(((Number) bbox.get("y")).intValue() + ((Number) bbox.get("height")).intValue());

                    savedRooms.add(roomRepository.save(room));
                }
            }

            return ResponseEntity.ok(savedRooms);
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
