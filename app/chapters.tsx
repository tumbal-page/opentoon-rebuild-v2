import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Chapter {
  id: string;
  title: string;
  url: string;
  pageCount: number;
  createdAt: string;
  status: "scanning" | "translating" | "completed";
}

export default function ChaptersScreen() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadChapters = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem("chapters");
      if (data) {
        setChapters(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load chapters:", error);
    }
  }, []);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChapters();
    setRefreshing(false);
  };

  const getStatusColor = (status: Chapter["status"]) => {
    switch (status) {
      case "completed": return "#1f9d55";
      case "translating": return "#FBBC05";
      case "scanning": return "#888";
      default: return "#888";
    }
  };

  const getStatusText = (status: Chapter["status"]) => {
    switch (status) {
      case "completed": return "Completed";
      case "translating": return "Translating...";
      case "scanning": return "Scanning";
      default: return "Scanning";
    }
  };

  const renderChapter = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      style={styles.chapterItem}
      onPress={() =>
        router.push({
          pathname: "/viewer",
          params: {
            chapterId: item.id,
            images: JSON.stringify([]),
            detectedBoxes: JSON.stringify([]),
          },
        })
      }
    >
      <View style={styles.chapterIcon}>
        <Text style={styles.chapterIconText}>📚</Text>
      </View>
      <View style={styles.chapterInfo}>
        <Text style={styles.chapterTitle}>{item.title}</Text>
        <Text style={styles.chapterMeta}>
          {item.pageCount} pages • {item.url ? new URL(item.url).hostname : "Unknown"}
        </Text>
        <View style={styles.chapterDetails}>
          <Text style={styles.chapterDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {chapters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>No chapters yet</Text>
          <Text style={styles.emptyDesc}>
            Enter a manga/manhwa URL to start translating
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/capture")}
          >
            <Text style={styles.createButtonText}>Scan Chapter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chapters}
          renderItem={renderChapter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
  },
  list: {
    padding: 16,
  },
  chapterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(87, 108, 219, 0.1)",
  },
  chapterIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2a2a4a",
    justifyContent: "center",
    alignItems: "center",
  },
  chapterIconText: {
    fontSize: 24,
  },
  chapterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chapterTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  chapterMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  chapterDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chapterDate: {
    color: "#666",
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#576CDB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
