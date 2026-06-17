import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { checkServerHealth, getAvailableLanguages } from "../src/services/translationService";

const STORAGE_KEYS = {
  LIBRETRANSLATE_URL: "libretranslate_url",
  SOURCE_LANG: "source_language",
  TARGET_LANG: "target_language",
};

export default function SettingsScreen() {
  const [libreTranslateUrl, setLibreTranslateUrl] = useState("http://192.168.1.100:5000");
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [serverStatus, setServerStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await SecureStore.getItemAsync(STORAGE_KEYS.LIBRETRANSLATE_URL);
      const src = await SecureStore.getItemAsync(STORAGE_KEYS.SOURCE_LANG);
      const tgt = await SecureStore.getItemAsync(STORAGE_KEYS.TARGET_LANG);

      if (url) setLibreTranslateUrl(url);
      if (src) setSourceLanguage(src);
      if (tgt) setTargetLanguage(tgt);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.LIBRETRANSLATE_URL, libreTranslateUrl);
      await SecureStore.setItemAsync(STORAGE_KEYS.SOURCE_LANG, sourceLanguage);
      await SecureStore.setItemAsync(STORAGE_KEYS.TARGET_LANG, targetLanguage);
      Alert.alert("Success", "Settings saved successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings");
    }
  };

  const testConnection = async () => {
    setServerStatus("checking");
    try {
      const isHealthy = await checkServerHealth();
      if (isHealthy) {
        setServerStatus("online");
        Alert.alert("Success", "LibreTranslate is online!");
      } else {
        setServerStatus("offline");
        Alert.alert("Error", "Cannot connect to LibreTranslate server.");
      }
    } catch (error) {
      setServerStatus("offline");
      Alert.alert("Error", `Connection failed: ${error}`);
    }
  };

  const languages = [
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "id", name: "Indonesian", flag: "🇮🇩" },
    { code: "ms", name: "Malay", flag: "🇲🇾" },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* LibreTranslate Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LibreTranslate Server</Text>
        <Text style={styles.sectionDesc}>
          Enter the IP address and port of your LibreTranslate instance.
        </Text>

        <Text style={styles.label}>Server URL / IP Address</Text>
        <TextInput
          style={styles.input}
          value={libreTranslateUrl}
          onChangeText={setLibreTranslateUrl}
          placeholder="http://192.168.1.100:5000"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity
          style={[
            styles.testButton,
            serverStatus === "online" && styles.testButtonOnline,
            serverStatus === "offline" && styles.testButtonOffline,
          ]}
          onPress={testConnection}
          disabled={serverStatus === "checking"}
        >
          {serverStatus === "checking" ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.testButtonText}>
              {serverStatus === "online"
                ? "✓ Connected"
                : serverStatus === "offline"
                ? "✗ Connection Failed"
                : "Test Connection"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Language Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language Settings</Text>

        <Text style={styles.label}>Source Language (manga/manhwa original)</Text>
        <View style={styles.languageGrid}>
          {languages
            .filter((l) => ["ja", "ko", "zh"].includes(l.code))
            .map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  sourceLanguage === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => setSourceLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>Target Language (translation output)</Text>
        <View style={styles.languageGrid}>
          {languages
            .filter((l) => ["en", "id", "ms"].includes(l.code))
            .map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  targetLanguage === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => setTargetLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          OpenToon Rebuild v2 - Manga/Manhwa Translation App{"\n\n"}
          Text Detection: TFLite (on-device){"\n"}
          Translation: LibreTranslate (self-hosted){"\n"}
          Capture: WebView scraping
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  testButton: {
    backgroundColor: "#2a2a4a",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  testButtonOnline: {
    backgroundColor: "#1f9d55",
  },
  testButtonOffline: {
    backgroundColor: "#cc2e24",
  },
  testButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageOption: {
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 2,
    borderColor: "transparent",
  },
  languageOptionActive: {
    borderColor: "#576CDB",
    backgroundColor: "#2a2a4a",
  },
  languageFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  languageName: {
    color: "#fff",
    fontSize: 12,
  },
  aboutText: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#576CDB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
