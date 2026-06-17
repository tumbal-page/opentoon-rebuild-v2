import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { translateDetectedBlocks, TranslatedBlock } from "../src/services/translationService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ViewerScreen() {
  const params = useLocalSearchParams<{
    images: string;
    detectedBoxes: string;
  }>();

  const [images] = useState<string[]>(JSON.parse(params.images || "[]"));
  const [detectedBoxes] = useState<{ imageIndex: number; boxes: any[] }[]>(
    JSON.parse(params.detectedBoxes || "[]")
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translatedBlocks, setTranslatedBlocks] = useState<TranslatedBlock[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayMode, setDisplayMode] = useState<"overlay" | "bubble" | "hidden">("overlay");
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("en");

  const currentImage = images[currentIndex];
  const currentBoxes = detectedBoxes.find((d) => d.imageIndex === currentIndex)?.boxes || [];

  const startTranslation = async () => {
    setIsTranslating(true);
    try {
      const results = await translateDetectedBlocks(
        currentBoxes,
        sourceLanguage,
        targetLanguage
      );
      setTranslatedBlocks(results);
    } catch (error) {
      Alert.alert("Translation Error", "Failed to translate. Check server settings.");
    } finally {
      setIsTranslating(false);
    }
  };

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTranslatedBlocks([]);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setTranslatedBlocks([]);
    }
  };

  const cycleDisplayMode = () => {
    const modes: ("overlay" | "bubble" | "hidden")[] = ["overlay", "bubble", "hidden"];
    const idx = modes.indexOf(displayMode);
    setDisplayMode(modes[(idx + 1) % modes.length]);
  };

  const imageHeight = SCREEN_HEIGHT * 0.6;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageInfo}>
          Page {currentIndex + 1} / {images.length}
        </Text>
        <Text style={styles.boxInfo}>
          {currentBoxes.length} text blocks
        </Text>
      </View>

      {/* Image Viewer */}
      <View style={styles.viewerContainer}>
        <ScrollView contentContainerStyle={styles.imageScroll}>
          <Image
            source={{ uri: currentImage }}
            style={[styles.image, { height: imageHeight }]}
            resizeMode="contain"
          />

          {/* Text Blocks Overlay */}
          {displayMode !== "hidden" && translatedBlocks.map((block, index) => {
            const scaleX = SCREEN_WIDTH / 1200;
            const scaleY = imageHeight / 1800;

            return (
              <View
                key={index}
                style={[
                  styles.textBlock,
                  {
                    left: block.x * scaleX,
                    top: block.y * scaleY,
                    width: block.width * scaleX,
                    height: block.height * scaleY,
                    backgroundColor:
                      displayMode === "bubble"
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(0,0,0,0.6)",
                    borderRadius:
                      displayMode === "bubble" ? block.height * scaleY * 0.3 : 4,
                    borderWidth: displayMode === "bubble" ? 1 : 0,
                    borderColor: displayMode === "bubble" ? "#333" : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textBlockText,
                    {
                      fontSize: block.fontSize || 12,
                      color: displayMode === "bubble" ? "#000" : "#fff",
                    },
                  ]}
                  numberOfLines={3}
                >
                  {block.translatedText}
                </Text>
              </View>
            );
          })}

          {/* Debug: Show bounding boxes when no translation */}
          {translatedBlocks.length === 0 &&
            currentBoxes.map((box: any, index: number) => (
              <View
                key={`debug-${index}`}
                style={[
                  styles.debugBox,
                  {
                    left: (box.x / 1200) * SCREEN_WIDTH,
                    top: (box.y / 1800) * imageHeight,
                    width: ((box.width || 100) / 1200) * SCREEN_WIDTH,
                    height: ((box.height || 40) / 1800) * imageHeight,
                    borderColor: box.classId === 1 ? "#576CDB" : "#1f9d55",
                  },
                ]}
              >
                <Text style={styles.debugText}>
                  {box.classId === 1 ? "Bubble" : "Text"}{" "}
                  {Math.round((box.confidence || 0) * 100)}%
                </Text>
              </View>
            ))}
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={prevImage}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.translateButton}
          onPress={startTranslation}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.translateButtonText}>🔄 Translate</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, displayMode === "bubble" && styles.modeButtonActive]}
          onPress={cycleDisplayMode}
        >
          <Text style={styles.modeButtonText}>
            {displayMode === "overlay"
              ? "📝 Overlay"
              : displayMode === "bubble"
              ? "💬 Bubble"
              : "👁️ Hidden"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex === images.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={nextImage}
          disabled={currentIndex === images.length - 1}
        >
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Language Settings */}
      <View style={styles.languageBar}>
        <Text style={styles.languageLabel}>From:</Text>
        <TouchableOpacity
          style={styles.languageChip}
          onPress={() => setSourceLanguage(sourceLanguage === "ja" ? "ko" : "ja")}
        >
          <Text style={styles.languageChipText}>
            {sourceLanguage === "ja" ? "🇯🇵 Japanese" : "🇰🇷 Korean"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.languageLabel}>To:</Text>
        <TouchableOpacity
          style={styles.languageChip}
          onPress={() => {
            const langs = ["en", "id", "ms", "zh"];
            const idx = langs.indexOf(targetLanguage);
            setTargetLanguage(langs[(idx + 1) % langs.length]);
          }}
        >
          <Text style={styles.languageChipText}>
            {targetLanguage === "en"
              ? "🇬🇧 English"
              : targetLanguage === "id"
              ? "🇮🇩 Indonesian"
              : targetLanguage === "ms"
              ? "🇲🇾 Malay"
              : "🇨🇳 Chinese"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#1a1a2e",
  },
  pageInfo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  boxInfo: {
    color: "#888",
    fontSize: 12,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  imageScroll: {
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
  },
  textBlock: {
    position: "absolute",
  },
  textBlockText: {
    textAlign: "center",
    paddingHorizontal: 2,
  },
  debugBox: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 2,
    backgroundColor: "rgba(87, 108, 219, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  debugText: {
    color: "#fff",
    fontSize: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1a1a2e",
    gap: 6,
  },
  navButton: {
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 13,
  },
  translateButton: {
    backgroundColor: "#576CDB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  translateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modeButton: {
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: "#1f9d55",
  },
  modeButtonText: {
    color: "#fff",
    fontSize: 11,
  },
  languageBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#0b1120",
    gap: 8,
  },
  languageLabel: {
    color: "#888",
    fontSize: 12,
  },
  languageChip: {
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#576CDB",
  },
  languageChipText: {
    color: "#fff",
    fontSize: 12,
  },
});
