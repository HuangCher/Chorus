import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase.config';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Household, Chore } from '../../types';

interface MemberStats {
  uid: string;
  name: string;
  email: string;
  completedChores: number;
  activeChores: number;
}

export default function HouseholdScreen() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [totalActiveChores, setTotalActiveChores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'join'>('join');
  const [householdCode, setHouseholdCode] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadHouseholdData();
  }, []);

  const loadHouseholdData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get user's household
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.householdId) {
        setLoading(false);
        return;
      }

      // Get household details
      const householdDoc = await getDoc(doc(db, 'households', userData.householdId));
      if (householdDoc.exists()) {
        const householdData = { id: householdDoc.id, ...householdDoc.data() } as Household;
        setHousehold(householdData);

        // Get all chores for household
        const choresQuery = query(
          collection(db, 'chores'),
          where('householdId', '==', userData.householdId)
        );
        const choresSnapshot = await getDocs(choresQuery);
        const allChores = choresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chore[];

        // Count total active chores
        const activeChores = allChores.filter(c => c.status === 'pending' || c.status === 'overdue');
        setTotalActiveChores(activeChores.length);

        // Get stats for each member
        const stats: MemberStats[] = [];
        for (const memberId of householdData.members) {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            const memberChores = allChores.filter(c => c.assignedTo === memberId);
            const completed = memberChores.filter(c => c.status === 'completed').length;
            const active = memberChores.filter(c => c.status === 'pending' || c.status === 'overdue').length;

            stats.push({
              uid: memberId,
              name: memberData.name || 'Unknown',
              email: memberData.email || '',
              completedChores: completed,
              activeChores: active,
            });
          }
        }

        // Sort by completed chores (descending)
        stats.sort((a, b) => b.completedChores - a.completedChores);
        setMemberStats(stats);
      }
    } catch (error) {
      console.error('Error loading household:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHouseholdCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateHousehold = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const code = generateHouseholdCode();
      const householdId = `household_${Date.now()}`;

      // Create household document
      await setDoc(doc(db, 'households', householdId), {
        code: code,
        createdAt: new Date(),
        members: [user.uid],
      });

      // Update user with household ID
      await updateDoc(doc(db, 'users', user.uid), {
        householdId: householdId,
      });

      Alert.alert('Success', `Household created! Share this code with roommates: ${code}`);
      setModalVisible(false);
      setHouseholdCode('');
      await loadHouseholdData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleJoinHousehold = async () => {
    if (!householdCode.trim()) {
      Alert.alert('Error', 'Please enter a household code');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      // Find household by code
      const householdsQuery = query(
        collection(db, 'households'),
        where('code', '==', householdCode.toUpperCase().trim())
      );
      const householdsSnapshot = await getDocs(householdsQuery);

      if (householdsSnapshot.empty) {
        Alert.alert('Error', 'Household not found. Please check the code.');
        return;
      }

      const householdDoc = householdsSnapshot.docs[0];
      const householdId = householdDoc.id;

      // Add user to household members
      await updateDoc(doc(db, 'households', householdId), {
        members: arrayUnion(user.uid),
      });

      // Update user with household ID
      await updateDoc(doc(db, 'users', user.uid), {
        householdId: householdId,
      });

      Alert.alert('Success', 'You have joined the household!');
      setModalVisible(false);
      setHouseholdCode('');
      await loadHouseholdData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openModal = (type: 'create' | 'join') => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/login' as any);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4059ffff" />
      </View>
    );
  }

  if (!household) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#4059ffff" />
        <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>No Household</Text>
              <Text style={styles.subtitle}>Join or create a household</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={64} color="#8F9BB3" />
              <Text style={styles.emptyText}>Not in a household</Text>
              <Text style={styles.emptySubtext}>Join or create one to get started</Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openModal('join')}
                >
                  <Ionicons name="enter-outline" size={20} color="#4059ffff" />
                  <Text style={styles.actionButtonText}>Join Household</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => openModal('create')}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>Create Household</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            />
          </View>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {modalType === 'create' ? 'Create Household' : 'Join Household'}
              </Text>
              
              {modalType === 'join' ? (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color="#8F9BB3" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter household code"
                      placeholderTextColor="#8F9BB3"
                      value={householdCode}
                      onChangeText={setHouseholdCode}
                      autoCapitalize="characters"
                      autoFocus
                      onSubmitEditing={handleJoinHousehold}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Ask your roommate for the 6-character household code
                  </Text>
                </>
              ) : (
                <Text style={styles.createText}>
                  Create a new household and get a code to share with your roommates
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setHouseholdCode('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={[styles.modalButton, styles.confirmButton]}>
                  <TouchableOpacity 
                    onPress={modalType === 'create' ? handleCreateHousehold : handleJoinHousehold}
                    style={{ width: '100%', alignItems: 'center' }}
                  >
                    <Text style={styles.confirmButtonText}>
                      {modalType === 'create' ? 'Create' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#4059ffff" />
      
      <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Household Stats</Text>
            <Text style={styles.subtitle}>Code: {household.code}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => openModal('join')}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content Card */}
      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContent}>
          
          {/* Total Active Chores */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="list-outline" size={24} color="#4059ffff" />
              </View>
              <Text style={styles.cardTitle}>Total Active Chores</Text>
            </View>
            <Text style={styles.cardValue}>{totalActiveChores}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {totalActiveChores === 0 ? 'All caught up!' : 'Keep working together!'}
              </Text>
            </View>
          </View>

          {/* All Members */}
          <View style={styles.membersCard}>
            <View style={styles.statHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="people-outline" size={24} color="#34C759" />
              </View>
              <Text style={styles.cardTitle}>All Members ({memberStats.length})</Text>
            </View>
            
            {memberStats.map((member, index) => (
              <View key={member.uid} style={styles.memberRow}>
                <View style={styles.memberLeft}>
                  <View style={[styles.rankBadge, index === 0 && styles.rankBadgeTop]}>
                    <Text style={[styles.rankText, index === 0 && styles.rankTextTop]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={[styles.avatarCircleSmall, index === 0 && styles.avatarCircleTop]}>
                    <Text style={styles.avatarTextSmall}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                </View>
                <View style={styles.memberStats}>
                  <View style={styles.statBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                    <Text style={styles.statBadgeText}>{member.completedChores}</Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: '#FFF4E6' }]}>
                    <Ionicons name="time" size={14} color="#FF9500" />
                    <Text style={[styles.statBadgeText, { color: '#FF9500' }]}>{member.activeChores}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 6,
  },
  cardContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statCard: {
    backgroundColor: '#f3f3f3ff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: '#6B7083',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    letterSpacing: -1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E4E9F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    color: '#6B7083',
    fontWeight: '600',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4059ffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  performerStats: {
    fontSize: 14,
    color: '#8F9BB3',
    fontWeight: '500',
  },
  membersCard: {
    backgroundColor: '#f3f3f3ff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E4E9F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankBadgeTop: {
    backgroundColor: '#FFD700',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7083',
  },
  rankTextTop: {
    color: '#fff',
  },
  avatarCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8F9BB3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleTop: {
    backgroundColor: '#4059ffff',
  },
  avatarTextSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#8F9BB3',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8F9BB3',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4059ffff',
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#4059ffff',
    borderColor: '#4059ffff',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4059ffff',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3ff',
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 55,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  helperText: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  createText: {
    fontSize: 15,
    color: '#6B7083',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f3f3ff',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7083',
  },
  confirmButton: {
    overflow: 'hidden',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
});