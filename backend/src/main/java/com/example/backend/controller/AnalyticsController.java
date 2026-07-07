package com.example.backend.controller;

import com.example.backend.entity.LocationHistory;
import com.example.backend.repository.LocationHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final LocationHistoryRepository locationHistoryRepository;

    @Autowired
    public AnalyticsController(LocationHistoryRepository locationHistoryRepository) {
        this.locationHistoryRepository = locationHistoryRepository;
    }

    @GetMapping("/history/{macAddress}")
    public List<LocationHistory> getHistory(@PathVariable String macAddress) {
        return locationHistoryRepository.findByDeviceMacOrderByEntryTimestampAsc(macAddress);
    }
}
