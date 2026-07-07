package com.example.backend.repository;

import com.example.backend.entity.LocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationHistoryRepository extends JpaRepository<LocationHistory, Long> {
    List<LocationHistory> findByDeviceMacOrderByEntryTimestampAsc(String deviceMac);
    Optional<LocationHistory> findTopByDeviceMacOrderByEntryTimestampDesc(String deviceMac);
}
