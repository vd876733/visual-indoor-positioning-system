package com.example.backend.repository;

import com.example.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrackedDeviceRepository extends JpaRepository<Device, Long> {
}
