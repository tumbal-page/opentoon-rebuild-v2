import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import {
  SCRAPE_INJECTION_SCRIPT,
  AUTO_SCROLL_SCRIPT,
  HORIZONTAL_SCROLL_SCRIPT,
} from "../src/utils/webviewScrape";
import {
  translateDetectedBlocks,
  DetectedTextBlock,
  TranslatedBlock,
} from "../src/services/translationService";
import {
  initStorage,
  createChapter,
  savePageImage,
  saveDetectionResults,
} from "../src/utils/chapterStorage";
import * as SecureStore from "expo-secure-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CapturedImage {
  url: string;
  width: number;
  height: number;
  source: string;
}

export default function CaptureScreen() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showWebView, setShowWebView] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");
  const webViewRef = useRef<WebView>(null);

  // Initialize storage on mount
  useEffect(() => {
    initStorage().catch(console.error);
  }, []);

  const handleLoadUrl = () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a chapter URL");
      return;
    }

    // Add https:// if missing
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setUrl(finalUrl);
    setShowWebView(true);
    setIsLoading(true);
    setCapturedImages([]);
    setSelectedImages(new Set());
  };

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.source === "opencomic-image-capture") {
        switch (data.type) {
          case "injection-complete":
            setIsLoading(false);
            Alert.alert(
              "Ready",
              `Found ${data.payload.candidateCount} candidate images. Scroll to load more.`
            );
            break;

          case "image-captured":
            setCapturedImages((prev) => {
              const exists = prev.some((img) => img.url === data.payload.url);
              if (exists) return prev;
              return [...prev, data.payload];
            });
            break;

          case "blob-captured":
            setCapturedImages((prev) => {
              const exists = prev.some((img) => img.url === data.payload.url);
              if (exists) return prev;
              return [
                ...prev,
                {
                  url: data.payload.url,
                  width: 0,
                  height: 0,
                  source: "blob",
                },
              ];
            });
            break;

          case "auto-scroll-complete":
          case "horizontal-scroll-complete":
            setIsLoading(false);
            Alert.alert(
              "Scan Complete",
              `Found ${data.payload.candidateCount} candidate images.`
            );
            break;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  const handleInjectScript = () => {
    webViewRef.current?.injectJavaScript(SCRAPE_INJECTION_SCRIPT);
  };

  const handleAutoScroll = () => {
    webViewRef.current?.injectJavaScript(AUTO_SCROLL_SCRIPT);
    setIsLoading(true);
  };

  const handleHorizontalScroll = () => {
    webViewRef.current?.injectJavaScript(HORIZONTAL_SCROLL_SCRIPT);
    setIsLoading(true);
  };

  const toggleImageSelection = (index: number) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleTranslate = async () => {
    if (selectedImages.size === 0) {
      Alert.alert("Error", "Please select at least one image");
      return;
    }

    setIsTranslating(true);

    try {
      // Step 1: Create chapter
      setProcessingStep("Creating chapter...");
      const sourceLanguage =
        (await SecureStore.getItemAsync("source_language")) || "ja";
      const targetLanguage =
        (await SecureStore.getItemAsync("target_language")) || "en";

      const chapterId = await createChapter(
        `Chapter ${new Date().toLocaleDateString()}`,
        url,
        sourceLanguage,
        targetLanguage
      );

      // Step 2: Save selected images to chapter storage
      setProcessingStep("Saving images...");
      const selectedArray = Array.from(selectedImages);
      const allDetectedBoxes: { imageIndex: number; boxes: DetectedTextBlock[] }[] = [];

      for (let i = 0; i < selectedArray.length; i++) {
        const idx = selectedArray[i];
        const image = capturedImages[idx];

        // Save image to chapter storage
        await savePageImage(chapterId, i, image.url);

        // Mock detection - in production, use TFLite
        const mockBoxes: DetectedTextBlock[] = [
          {
            x: 50,
            y: 100,
            width: 200,
            height: 60,
            classId: 1,
            confidence: 0.9,
            x2: 250,
            y2: 160,
          },
          {
            x: 50,
            y: 200,
            width: 300,
            height: 40,
            classId: 2,
            confidence: 0.85,
            x2: 350,
            y2: 240,
          },
        ];

        // Save detection results
        await saveDetectionResults(chapterId, i, mockBoxes);

        allDetectedBoxes.push({
          imageIndex: i,
          boxes: mockBoxes,
        });
      }

      // Step 3: Navigate to viewer
      setProcessingStep("Opening viewer...");
      router.push({
        pathname: "/viewer",
        params: {
          chapterId,
          images: JSON.stringify(
            selectedArray.map((idx) => capturedImages[idx].url)
          ),
          detectedBoxes: JSON.stringify(allDetectedBoxes),
        },
      });
    } catch (error) {
      Alert.alert("Error", `Processing failed: ${error}`);
    } finally {
      setIsTranslating(false);
      setProcessingStep("");
    }
  };

  return (
    <View style={styles.container}>
      {/* URL Input */}
      <View style={styles.urlBar}>
        <TextInput
          style={styles.urlInput}
          value={url}
          onChangeText={setUrl}
          placeholder="Enter chapter URL (e.g., webtoon.kakao.com/...)"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={handleLoadUrl}
        />
        <TouchableOpacity style={styles.loadButton} onPress={handleLoadUrl}>
          <Text style={styles.loadButtonText}>Load</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      {showWebView && (
        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webview}
            onLoadEnd={() => {
              setIsLoading(false);
              handleInjectScript();
            }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            mixedContentMode="always"
            allowFileAccess={true}
            userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
          />

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#576CDB" />
              <Text style={styles.loadingText}>Loading page...</Text>
            </View>
          )}

          {/* WebView Controls */}
          <View style={styles.webviewControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleInjectScript}
            >
              <Text style={styles.controlButtonText}>🔍 Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleAutoScroll}
            >
              <Text style={styles.controlButtonText}>⬇️ Auto Scroll</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleHorizontalScroll}
            >
              <Text style={styles.controlButtonText}>➡️ Horizontal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowWebView(false)}
            >
              <Text style={styles.controlButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Processing Status */}
      {isTranslating && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#576CDB" />
          <Text style={styles.processingText}>{processingStep}</Text>
        </View>
      )}

      {/* Captured Images */}
      {capturedImages.length > 0 && !showWebView && (
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedTitle}>
            Captured: {capturedImages.length} images (
            {selectedImages.size} selected)
          </Text>

          <FlatList
            data={capturedImages}
            numColumns={3}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.capturedItem,
                  selectedImages.has(index) && styles.capturedItemSelected,
                ]}
                onPress={() => toggleImageSelection(index)}
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.capturedImage}
                  resizeMode="cover"
                />
                <Text style={styles.capturedIndex}>{index + 1}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.capturedList}
          />

          <TouchableOpacity
            style={styles.translateButton}
            onPress={handleTranslate}
            disabled={isTranslating || selectedImages.size === 0}
          >
            {isTranslating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.translateButtonText}>
                Process & Translate ({selectedImages.size} images)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
  },
  urlBar: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#1a1a2e",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: "#2a2a4a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  loadButton: {
    backgroundColor: "#576CDB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  loadButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 17, 32, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
  },
  webviewControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    backgroundColor: "#1a1a2e",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  controlButton: {
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  capturedContainer: {
    flex: 1,
    padding: 12,
  },
  capturedTitle: {
    color: "#888",
    fontSize: 12,
    marginBottom: 8,
  },
  capturedList: {
    paddingBottom: 12,
  },
  capturedItem: {
    width: (SCREEN_WIDTH - 40) / 3,
    height: 120,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  capturedItemSelected: {
    borderColor: "#576CDB",
  },
  capturedImage: {
    width: "100%",
    height: "100%",
  },
  capturedIndex: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: 10,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  translateButton: {
    backgroundColor: "#576CDB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  translateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  processingContainer: {
    backgroundColor: "rgba(11, 17, 32, 0.95)",
    padding: 16,
    alignItems: "center",
  },
  processingText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
  },
});
