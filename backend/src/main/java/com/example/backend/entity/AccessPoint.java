package com.example.backend.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "access_points")
public class AccessPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String bssid;

    @Column(nullable = false)
    private String routerName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @OneToMany(mappedBy = "accessPoint", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Device> trackedDevices = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public String getBssid() {
        return bssid;
    }

    public void setBssid(String bssid) {
        this.bssid = bssid;
    }

    public String getRouterName() {
        return routerName;
    }

    public void setRouterName(String routerName) {
        this.routerName = routerName;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public List<Device> getTrackedDevices() {
        return trackedDevices;
    }

    public void setTrackedDevices(List<Device> trackedDevices) {
        this.trackedDevices = trackedDevices;
    }
}
