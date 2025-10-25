import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase.config";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/(tabs)/household");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.header}>
        <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain"/>
        <Text style={styles.headerTitle}>Welcome back</Text>
        <Text style={styles.headerSub}>Log in to continue!</Text>
      </LinearGradient>

      <View style={styles.card}>
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

        {/* Login Button */}
        <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.button}>
          <TouchableOpacity onPress={handleLogin} style={{ width: "100%", alignItems: "center" }}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Switch to Sign Up */}
        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={{ fontWeight: "600" }}>Sign Up</Text>
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
    fontSize: 35, 
    paddingBottom: 8,
    color: "#fff", 
    fontWeight: "700",
    textAlign: "center"  
  },
  headerSub: { 
    color: "rgba(255,255,255,0.8)", 
    marginBottom: 30, 
    fontSize: 18,
    textAlign: "center"  
  },
  card: {
    marginTop: -90,  
    padding: 30,
    paddingTop: 40,        
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28,
    elevation: 6,
    gap: 15,
    height: '100%'
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center", 
    backgroundColor: "#f3f3f3ff",
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
  },
  input: { 
    flex: 1,
    fontSize: 16, 
    color: "#111" 
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
    fontWeight: "600" 
  },
  switchText: {
    textAlign: "center",
    marginTop: 12,
    color: "#6B7083",
    fontSize: 14,
  },
});
