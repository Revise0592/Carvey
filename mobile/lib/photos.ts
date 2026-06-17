import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export type PhotoResult = { original: string; thumbnail: string };

export async function pickAndSaveVehiclePhoto(
  source: "camera" | "library"
): Promise<PhotoResult | null> {
  let result: ImagePicker.ImagePickerResult;

  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return null;
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return null;
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });
  }

  if (result.canceled || !result.assets?.[0]) return null;
  const sourceUri = result.assets[0].uri;

  const dir = FileSystem.documentDirectory + "vehicle-photos/";
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const base = `vehicle_${Date.now()}`;

  const [origManipulated, thumbManipulated] = await Promise.all([
    ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    ),
    ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    ),
  ]);

  const origPath = dir + base + ".jpg";
  const thumbPath = dir + base + "_thumb.jpg";

  await Promise.all([
    FileSystem.copyAsync({ from: origManipulated.uri, to: origPath }),
    FileSystem.copyAsync({ from: thumbManipulated.uri, to: thumbPath }),
  ]);

  return { original: origPath, thumbnail: thumbPath };
}

export async function deleteVehiclePhoto(
  photoPath: string | null,
  thumbnailPath: string | null
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (photoPath) ops.push(FileSystem.deleteAsync(photoPath, { idempotent: true }));
  if (thumbnailPath) ops.push(FileSystem.deleteAsync(thumbnailPath, { idempotent: true }));
  await Promise.allSettled(ops);
}
