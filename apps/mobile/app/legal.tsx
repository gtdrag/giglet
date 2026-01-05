import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';

// Placeholder URLs - update before release
const PRIVACY_POLICY_URL = 'https://giglet.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://giglet.app/terms';

interface LegalDocument {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
}

const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your data',
    icon: 'shield-checkmark',
    url: PRIVACY_POLICY_URL,
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    description: 'Rules and guidelines for using Giglet',
    icon: 'document-text',
    url: TERMS_OF_SERVICE_URL,
  },
];

export default function LegalScreen() {
  const openDocument = async (document: LegalDocument) => {
    try {
      await Linking.openURL(document.url);
    } catch {
      Alert.alert('Error', `Could not open ${document.title}. Please try again later.`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.title}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Description */}
        <Text style={styles.description}>
          Review our legal documents to understand how Giglet works and how we handle your data.
        </Text>

        {/* Legal Documents */}
        <View style={styles.documentsContainer}>
          {LEGAL_DOCUMENTS.map((document) => (
            <Pressable
              key={document.id}
              style={styles.documentCard}
              onPress={() => openDocument(document)}
            >
              <View style={styles.documentLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={document.icon} size={24} color="#10b981" />
                </View>
                <View style={styles.documentTextContainer}>
                  <Text style={styles.documentTitle}>{document.title}</Text>
                  <Text style={styles.documentDescription}>{document.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#71717A" />
            </Pressable>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#71717A" />
          <Text style={styles.infoText}>
            These documents will open in your device's browser. You can review them at any time
            from the Settings menu.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    color: '#A1A1AA',
    lineHeight: 22,
    marginBottom: 24,
  },
  documentsContainer: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTextContainer: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
});
