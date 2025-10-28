
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AppState,
  Platform,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Activity, Cpu, HardDrive, Battery } from 'lucide-react-native';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import fonts from '../assets/data/fonts';

// Import native module
const { SystemResourceMonitor } = NativeModules;
const resourceEmitter = new NativeEventEmitter(SystemResourceMonitor);

const CircularProgress = ({ value, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Svg
      width={size}
      height={size}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Defs>
        <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60a5fa" />
          <Stop offset="100%" stopColor="#a78bfa" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#gradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
};

const ResourceMonitorApp = () => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [memoryUsedGB, setMemoryUsedGB] = useState(0);
  const [memoryTotalGB, setMemoryTotalGB] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('Calculating...');
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [storageFree, setStorageFree] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [networkType, setNetworkType] = useState('Unknown');
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [deviceModel, setDeviceModel] = useState('');
  const [systemVersion, setSystemVersion] = useState('');
  const [brand, setBrand] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Initialize real-time monitoring
  useEffect(() => {
    // Get initial device info
    getDeviceInfo();
    
    // Start monitoring if native module exists
    if (SystemResourceMonitor) {
      SystemResourceMonitor.startMonitoring();
      
      // Listen for CPU updates
const cpuSubscription = resourceEmitter.addListener(
  'onCPUUpdate',
  (data) => {
    console.log('CPU Update received:', data); // ADD THIS LINE
    setCpuUsage(data.usage);
    setLastUpdate(new Date());
  }
);
      
      // Listen for Memory updates
      const memorySubscription = resourceEmitter.addListener(
        'onMemoryUpdate',
        (data) => {
          setMemoryUsage(data.usagePercent);
          setMemoryUsedGB((data.used / (1024 * 1024 * 1024)).toFixed(1));
          setMemoryTotalGB((data.total / (1024 * 1024 * 1024)).toFixed(1));
          setLastUpdate(new Date());
        }
      );
      
      // Listen for Battery updates
      const batterySubscription = resourceEmitter.addListener(
        'onBatteryUpdate',
        (data) => {
          setBatteryLevel(data.level);
          setIsCharging(data.isCharging);
          
          if (!data.isCharging && data.level > 0) {
            const hours = Math.floor(data.timeRemaining / 3600);
            const minutes = Math.floor((data.timeRemaining % 3600) / 60);
            setTimeRemaining(`${hours}h ${minutes}m remaining`);
          } else if (data.isCharging && data.level < 100) {
            const hours = Math.floor(data.timeToFull / 3600);
            const minutes = Math.floor((data.timeToFull % 3600) / 60);
            setTimeRemaining(`${hours}h ${minutes}m to full`);
          } else {
            setTimeRemaining('Fully charged');
          }
          setLastUpdate(new Date());
        }
      );
      
      // Listen for Storage updates
      const storageSubscription = resourceEmitter.addListener(
        'onStorageUpdate',
        (data) => {
          setStorageUsed((data.used / (1024 * 1024 * 1024)).toFixed(0));
          setStorageTotal((data.total / (1024 * 1024 * 1024)).toFixed(0));
          setStorageFree((data.free / (1024 * 1024 * 1024)).toFixed(0));
          setLastUpdate(new Date());
        }
      );
      
      // Listen for Network updates
      const networkSubscription = resourceEmitter.addListener(
        'onNetworkUpdate',
        (data) => {
          setNetworkType(data.type);
          setDownloadSpeed(data.downloadSpeed);
          setUploadSpeed(data.uploadSpeed);
          setNetworkSpeed(data.downloadSpeed); // Display download speed
          setLastUpdate(new Date());
        }
      );

      return () => {
        SystemResourceMonitor.stopMonitoring();
        cpuSubscription.remove();
        memorySubscription.remove();
        batterySubscription.remove();
        storageSubscription.remove();
        networkSubscription.remove();
      };
    } else {
      // Fallback to device-info if native module not available
      console.warn('SystemResourceMonitor native module not found. Using fallback.');
      getFallbackData();
      const interval = setInterval(getFallbackData, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  // App state monitoring
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setIsMonitoring(true);
        if (SystemResourceMonitor) {
          SystemResourceMonitor.startMonitoring();
        }
      } else {
        setIsMonitoring(false);
        if (SystemResourceMonitor) {
          SystemResourceMonitor.stopMonitoring();
        }
      }
    });

    return () => subscription.remove();
  }, []);

  // Fallback data using react-native-device-info
  const getFallbackData = async () => {
    try {
      // Memory
      const usedMemory = await DeviceInfo.getUsedMemory();
      const totalMemory = await DeviceInfo.getTotalMemory();
      setMemoryUsage((usedMemory / totalMemory) * 100);
      setMemoryUsedGB((usedMemory / (1024 * 1024 * 1024)).toFixed(1));
      setMemoryTotalGB((totalMemory / (1024 * 1024 * 1024)).toFixed(1));

      // Battery
      const battery = await DeviceInfo.getBatteryLevel();
      const charging = await DeviceInfo.isBatteryCharging();
      setBatteryLevel(battery * 100);
      setIsCharging(charging);

      // Storage
      const freeDisk = await DeviceInfo.getFreeDiskStorage();
      const totalDisk = await DeviceInfo.getTotalDiskCapacity();
      setStorageUsed(((totalDisk - freeDisk) / (1024 * 1024 * 1024)).toFixed(0));
      setStorageTotal((totalDisk / (1024 * 1024 * 1024)).toFixed(0));
      setStorageFree((freeDisk / (1024 * 1024 * 1024)).toFixed(0));

      // Network
      const netState = await NetInfo.fetch();
      setNetworkType(netState.type);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.log('Fallback data error:', error);
    }
  };

  const getDeviceInfo = async () => {
    try {
      const model = await DeviceInfo.getModel();
      const version = DeviceInfo.getSystemVersion();
      const brandName = DeviceInfo.getBrand();
      
      setDeviceModel(model);
      setSystemVersion(version);
      setBrand(brandName);
    } catch (error) {
      console.log('Device info error:', error);
    }
  };

  const handleRefresh = () => {
    if (SystemResourceMonitor) {
      SystemResourceMonitor.forceUpdate();
    } else {
      getFallbackData();
    }
  };

  const storagePercent = storageTotal > 0 
    ? ((storageUsed / storageTotal) * 100).toFixed(0) 
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerText}>Hello</Text>
          <Text style={styles.headerText2}>Dr. Satyabrata Das</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
            <Activity size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CPU & Memory */}
      <View style={styles.row}>
        <View style={styles.card}>
          <View style={styles.iconTopRight}>
            <Cpu size={20} color="#777" />
          </View>
          <View style={styles.center}>
            <CircularProgress value={cpuUsage} size={100} />
            <View style={styles.overlayCenter}>
              <Text style={styles.bigText}>{Math.round(cpuUsage)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>CPU Usage</Text>
          <Text style={styles.subText}>Real-time</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconTopRight}>
            <Activity size={20} color="#777" />
          </View>
          <Text style={styles.hugeText}>{Math.round(memoryUsage)}%</Text>
          <Text style={styles.cardTitle}>Memory</Text>
          <Text style={styles.subText}>{memoryUsedGB} / {memoryTotalGB} GB</Text>
        </View>
      </View>

      {/* Battery & Status */}
      <View style={styles.cardFull}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={styles.center}>
              <CircularProgress
                value={batteryLevel}
                size={80}
                strokeWidth={6}
              />
              <View style={styles.overlayCenter}>
                <Battery 
                  size={24} 
                  color={batteryLevel > 20 ? "#22c55e" : "#ef4444"} 
                />
                <Text style={styles.batteryText}>
                  {Math.round(batteryLevel)}%
                </Text>
              </View>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.sectionTitle}>
                Battery {isCharging && '⚡'}
              </Text>
              <Text style={styles.subText}>{timeRemaining}</Text>
            </View>
          </View>
          <Activity size={20} color="#777" />
        </View>
      </View>

      {/* Storage */}
      <View style={styles.cardFull}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Storage</Text>
            <Text style={styles.subText}>{storageFree} GB free</Text>
          </View>
          <HardDrive size={20} color="#777" />
        </View>
        <Text style={styles.hugeText}>
          {storageUsed} <Text style={styles.subText}>GB used</Text>
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${storagePercent}%` }]} />
        </View>
        <Text style={styles.subText}>
          {storagePercent}% of {storageTotal} GB
        </Text>
      </View>

      {/* Network */}
      <View style={styles.cardFull}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Network</Text>
            <Text style={styles.subText}>
              {networkType.toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.networkSpeed}>
              ↓ {downloadSpeed.toFixed(1)} <Text style={styles.subText}>Mbps</Text>
            </Text>
            <Text style={styles.networkSpeed}>
              ↑ {uploadSpeed.toFixed(1)} <Text style={styles.subText}>Mbps</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Device Info */}
      <View style={styles.cardFull}>
        <Text style={styles.cardTitle}>Device Information</Text>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.subText}>Model</Text>
          <Text style={styles.infoText}>{deviceModel || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.subText}>OS</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' ? 'iOS' : 'Android'} {systemVersion}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.subText}>Brand</Text>
          <Text style={styles.infoText}>{brand || 'Unknown'}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: isMonitoring ? '#22c55e' : '#9ca3af' }]} />
        <Text style={styles.statusText}>
          {isMonitoring ? 'Live monitoring' : 'Paused'} • Updated {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

export default ResourceMonitorApp;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141414', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: { color: '#fff', fontSize: 16, fontFamily: fonts.m },
  headerText2: {
    color: '#6366f1',
    fontFamily: fonts.l,
    fontSize: 20,
    marginTop: -4,
  },
  headerButtons: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 16,
    position: 'relative',
  },
  cardFull: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  iconTopRight: { position: 'absolute', top: 8, right: 8 },
  center: { justifyContent: 'center', alignItems: 'center' },
  overlayCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigText: { color: 'white', fontSize: 24, fontFamily: fonts.l },
  hugeText: {
    color: 'white',
    fontSize: 32,
    fontFamily: fonts.xl,
    marginBottom: 6,
  },
  cardTitle: { color: 'white', fontSize: 16, fontFamily: fonts.md },
  subText: { color: '#9ca3af', fontSize: 12, fontFamily: fonts.s },
  sectionTitle: { color: 'white', fontSize: 18, fontFamily: fonts.md },
  batteryText: {
    color: 'white',
    fontSize: 12,
    fontFamily: fonts.md,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 12 },
  progressBar: {
    backgroundColor: '#374151',
    borderRadius: 10,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 10, backgroundColor: '#6366f1' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: { color: 'white', fontSize: 14, fontFamily: fonts.md },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#9ca3af', fontSize: 10, fontFamily: fonts.s },
  networkSpeed: { color: 'white', fontSize: 18, fontFamily: fonts.md },
});
