import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { useCreateFamily } from "@/lib/families";
import { spacing } from "@/lib/theme";

/** Créer une famille : un nom, puis directement l’écran d’invitation. */
export default function NewFamily() {
  const [name, setName] = useState("");
  const create = useCreateFamily();
  const valid = name.trim().length > 0;

  return (
    <Screen edges={[]} keyboard>
      <AppText muted>Vous en serez l’administrateur : vous invitez les membres et pouvez nommer d’autres administrateurs.</AppText>
      <TextField
        label="Nom de la famille"
        value={name}
        onChangeText={setName}
        placeholder="Famille Akdim"
        maxLength={60}
        autoFocus
        returnKeyType="done"
        error={create.isError ? errorMessage(create.error) : null}
      />
      <Button
        title="Créer"
        disabled={!valid}
        loading={create.isPending}
        style={styles.button}
        onPress={() =>
          create.mutate(name.trim(), {
            onSuccess: ({ id }) => router.replace({ pathname: "/famille/[id]/inviter", params: { id } }),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ button: { marginTop: spacing.sm } });
