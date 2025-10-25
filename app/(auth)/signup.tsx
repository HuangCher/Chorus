import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name.trim(),
        email: email,
        strikes: 0,
        completedChores: 0,
        createdAt: new Date()
      });
      Alert.alert("Success", "Account created!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.header}>
        <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain"/>
        <Text style={styles.headerTitle}>Create your account</Text>
        <Text style={styles.headerSub}>Let's get started!</Text>
      </LinearGradient>

      <View style={styles.card}>
        {/* Name */}
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#8F9BB3" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#8F9BB3"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#8F9BB3" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8F9BB3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#8F9BB3" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8F9BB3"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
          <Text style={{ paddingLeft: 8, marginTop: -5, color: "#6B7083", fontSize: 14 }}>
            Must be at least 6 characters
          </Text>

        {/* Sign Up Button */}
        <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.button}>
          <TouchableOpacity onPress={handleSignup} style={{ width: "100%", alignItems: "center" }}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Switch to Login */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={{ fontWeight: "600" }}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#F4F6FA" 
  },
  logo: {
    position: "absolute",
    top: 60,
    right: 24,
    width: 50,
    height: 50,
  },
  header: {
    height: 400,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 30,
    paddingBottom: 8,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center"
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: 50,
    fontSize: 18,
    textAlign: "center"
  },
  card: {
    marginTop: -150,
    padding: 30,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 6,
    gap: 15,
    height: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f3f3ff",
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 55,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  button: {
    marginTop: 40,
    borderRadius: 14,
    height: 55,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  switchText: {
    textAlign: "center",
    marginTop: 12,
    color: "#6B7083",
    fontSize: 14,
  },
});
