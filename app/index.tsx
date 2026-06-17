import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>OpenToon</Text>
        <Text style={styles.subtitle}>Manga/Manhwa Translator</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/capture")}
        >
          <Text style={styles.buttonIcon}>🌐</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Scan Chapter</Text>
            <Text style={styles.buttonDesc}>
              Open manga website and capture pages
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/chapters")}
        >
          <Text style={styles.buttonIcon}>📚</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>My Chapters</Text>
            <Text style={styles.buttonDesc}>
              View saved and translated chapters
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.buttonIcon}>⚙️</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Settings</Text>
            <Text style={styles.buttonDesc}>
              Configure translation server & preferences
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Backend: Configure LibreTranslate in Settings
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "Figtree",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(87, 108, 219, 0.2)",
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#666",
  },
});
