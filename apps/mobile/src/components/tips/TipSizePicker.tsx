import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TipSize, getTipSizeLabel, getTipSizeColor } from '../../services/tips';

const TIP_SIZES: TipSize[] = ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'];

interface TipSizePickerProps {
  onSelect: (tipSize: TipSize) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TipSizePicker({ onSelect, disabled = false, isLoading = false }: TipSizePickerProps) {
  const handleSelect = async (tipSize: TipSize) => {
    if (disabled || isLoading) return;

    // Haptic feedback on selection
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(tipSize);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How was the tip?</Text>
      <Text style={styles.subtitle}>Tap to log this location</Text>

      <View style={styles.buttonContainer}>
        {TIP_SIZES.map((tipSize) => (
          <Pressable
            key={tipSize}
            style={({ pressed }) => [
              styles.button,
              { borderColor: getTipSizeColor(tipSize) },
              pressed && styles.buttonPressed,
              (disabled || isLoading) && styles.buttonDisabled,
            ]}
            onPress={() => handleSelect(tipSize)}
            disabled={disabled || isLoading}
          >
            <Text style={[styles.buttonText, { color: getTipSizeColor(tipSize) }]}>
              {getTipSizeLabel(tipSize)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#06B6D4" />
          <Text style={styles.loadingText}>Saving...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FAFAFA',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#18181B',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#71717A',
  },
});
