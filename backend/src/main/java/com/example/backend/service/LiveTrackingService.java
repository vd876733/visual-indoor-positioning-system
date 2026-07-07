package com.example.backend.service;

import com.example.backend.entity.AccessPoint;
import com.example.backend.entity.Device;
import com.example.backend.entity.LocationHistory;
import com.example.backend.entity.Room;
import com.example.backend.repository.AccessPointRepository;
import com.example.backend.repository.LocationHistoryRepository;
import com.example.backend.repository.RoomRepository;
import com.example.backend.repository.TrackedDeviceRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@EnableScheduling
public class LiveTrackingService {

    private final RoomRepository roomRepository;
    private final AccessPointRepository accessPointRepository;
    private final TrackedDeviceRepository trackedDeviceRepository;
    private final LocationHistoryRepository locationHistoryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final Random random = new Random();

    public LiveTrackingService(
            RoomRepository roomRepository,
            AccessPointRepository accessPointRepository,
            TrackedDeviceRepository trackedDeviceRepository,
            LocationHistoryRepository locationHistoryRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.roomRepository = roomRepository;
        this.accessPointRepository = accessPointRepository;
        this.trackedDeviceRepository = trackedDeviceRepository;
        this.locationHistoryRepository = locationHistoryRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Scheduled(fixedRate = 2000)
    public void simulateLiveTracking() {
        if (roomRepository.count() == 0) {
            seedPrototypeData();
        }

        Device device = trackedDeviceRepository.findAll().stream()
                .filter(candidate -> "AA:BB:CC:DD:EE:FF".equals(candidate.getMacAddress()))
                .findFirst()
                .orElseGet(() -> {
                    Device newDevice = new Device();
                    newDevice.setDeviceName("Target_Phone");
                    newDevice.setMacAddress("AA:BB:CC:DD:EE:FF");
                    newDevice.setIsAuthorized(true);
                    newDevice.setOwnerName("Demo Owner");
                    return trackedDeviceRepository.save(newDevice);
                });

        List<AccessPoint> accessPoints = accessPointRepository.findAll();
        if (accessPoints.isEmpty()) {
            return;
        }

        AccessPoint closestAccessPoint = null;
        double bestSignalStrength = Double.NEGATIVE_INFINITY;

        for (AccessPoint accessPoint : accessPoints) {
            Room room = accessPoint.getRoom();
            if (room == null) {
                continue;
            }

            int centerX = (room.getX1() + room.getX2()) / 2;
            int centerY = (room.getY1() + room.getY2()) / 2;

            int noise = random.nextInt(15);
            double signalStrength = 95 - Math.abs(centerX - (centerX + noise)) - Math.abs(centerY - (centerY + noise)) + random.nextInt(10);

            if (signalStrength > bestSignalStrength) {
                bestSignalStrength = signalStrength;
                closestAccessPoint = accessPoint;
            }
        }

        if (closestAccessPoint == null || closestAccessPoint.getRoom() == null) {
            return;
        }

        Room currentRoom = closestAccessPoint.getRoom();
        int x = (currentRoom.getX1() + currentRoom.getX2()) / 2;
        int y = (currentRoom.getY1() + currentRoom.getY2()) / 2;

        recordLocationHistory(device, currentRoom);

        Map<String, Object> payload = Map.of(
                "deviceId", device.getId(),
                "macAddress", device.getMacAddress(),
                "x", x,
                "y", y,
                "currentRoom", currentRoom.getName(),
                "isAuthorized", device.getIsAuthorized()
        );

        messagingTemplate.convertAndSend("/topic/live-tracking", payload);

        if (!Boolean.TRUE.equals(device.getIsAuthorized())) {
            publishSecurityAlert(currentRoom, device);
        }
    }

    private void recordLocationHistory(Device device, Room room) {
        LocalDateTime now = LocalDateTime.now();
        locationHistoryRepository.findTopByDeviceMacOrderByEntryTimestampDesc(device.getMacAddress())
                .ifPresent(previous -> {
                    if (previous.getExitTimestamp() == null) {
                        previous.setExitTimestamp(now);
                        locationHistoryRepository.save(previous);
                    }
                });

        LocationHistory history = new LocationHistory();
        history.setDeviceMac(device.getMacAddress());
        history.setRoomName(room.getName());
        history.setEntryTimestamp(now);
        locationHistoryRepository.save(history);
    }

    @Async
    public void publishSecurityAlert(Room room, Device device) {
        Map<String, Object> alertPayload = Map.of(
                "message", "CRITICAL: Unauthorized device detected in " + room.getName(),
                "deviceMac", device.getMacAddress(),
                "roomName", room.getName(),
                "severity", "critical"
        );
        messagingTemplate.convertAndSend("/topic/alerts", alertPayload);
    }

    private void seedPrototypeData() {
        Room roomA = new Room();
        roomA.setName("Living Room");
        roomA.setX1(20);
        roomA.setY1(20);
        roomA.setX2(220);
        roomA.setY2(180);
        roomRepository.save(roomA);

        Room roomB = new Room();
        roomB.setName("Kitchen");
        roomB.setX1(260);
        roomB.setY1(30);
        roomB.setX2(430);
        roomB.setY2(200);
        roomRepository.save(roomB);

        Room roomC = new Room();
        roomC.setName("Bedroom");
        roomC.setX1(480);
        roomC.setY1(40);
        roomC.setX2(660);
        roomC.setY2(220);
        roomRepository.save(roomC);

        createAccessPoint("AA:11:22:33:44:55", "Router-Living", roomA);
        createAccessPoint("BB:22:33:44:55:66", "Router-Kitchen", roomB);
        createAccessPoint("CC:33:44:55:66:77", "Router-Bedroom", roomC);
    }

    private void createAccessPoint(String bssid, String routerName, Room room) {
        AccessPoint accessPoint = new AccessPoint();
        accessPoint.setBssid(bssid);
        accessPoint.setRouterName(routerName);
        accessPoint.setRoom(room);
        accessPointRepository.save(accessPoint);
    }
}
