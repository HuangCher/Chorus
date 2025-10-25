import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase.config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Chore } from '../../types';

interface ChoreWithUser extends Chore {
  assignedName: string;
}

export default function DashboardScreen() {
  const [myChores, setMyChores] = useState<ChoreWithUser[]>([]);
  const [othersChores, setOthersChores] = useState<ChoreWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.householdId) {
        setLoading(false);
        return;
      }

      // Get all chores for household
      const choresQuery = query(
        collection(db, 'chores'),
        where('householdId', '==', userData.householdId)
      );
      const choresSnapshot = await getDocs(choresQuery);
      const allChores = choresSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        dueBy: doc.data().dueBy?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Chore[];

      // Get user names for each chore
      const choresWithNames: ChoreWithUser[] = [];
      for (const chore of allChores) {
        const assignedUserDoc = await getDoc(doc(db, 'users', chore.assignedTo));
        const assignedName = assignedUserDoc.exists() ? assignedUserDoc.data().name : 'Unknown';
        choresWithNames.push({ ...chore, assignedName });
      }

      // Separate my chores and others' chores
      const mine = choresWithNames.filter(c => c.assignedTo === user.uid && c.status !== 'completed');
      const others = choresWithNames.filter(c => c.assignedTo !== user.uid && c.status !== 'completed');

      setMyChores(mine);
      setOthersChores(others);
    } catch (error) {
      console.error('Error loading chores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    try {
      await updateDoc(doc(db, 'chores', choreId), {
        status: 'completed',
      });
      await loadChores(); // Reload chores
    } catch (error) {
      console.error('Error completing chore:', error);
    }
  };

  const getChoreIcon = (type: string) => {
    const icons: Record<string, string> = {
      dishes: 'restaurant-outline',
      trash: 'trash-outline',
      vacuum: 'snow-outline',
      laundry: 'shirt-outline',
      cleanup: 'broom-outline',
      grocery: 'cart-outline',
    };
    return icons[type] || 'checkbox-outline';
  };

  const getChoreColor = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      dishes: { bg: '#E8F5FF', color: '#0A84FF' },
      trash: { bg: '#F0F0F0', color: '#8E8E93' },
      vacuum: { bg: '#F0E8FF', color: '#5E5CE6' },
      laundry: { bg: '#E8F5E9', color: '#34C759' },
      cleanup: { bg: '#FFF4E6', color: '#FF9500' },
      grocery: { bg: '#FFEBEE', color: '#FF3B30' },
    };
    return colors[type] || { bg: '#F0F0F0', color: '#8E8E93' };
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffHours < 24) return `${diffHours}h left`;
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const ChoreCard = ({ chore, isMine }: { chore: ChoreWithUser; isMine: boolean }) => {
    const colors = getChoreColor(chore.type);
    const isOverdue = chore.status === 'overdue' || new Date(chore.dueBy) < new Date();

    return (
      <View style={styles.choreCard}>
        <View style={styles.choreLeft}>
          <View style={[styles.choreIcon, { backgroundColor: colors.bg }]}>
            <Ionicons name={getChoreIcon(chore.type) as any} size={24} color={colors.color} />
          </View>
          <View style={styles.choreInfo}>
            <Text style={styles.choreName}>{chore.type.charAt(0).toUpperCase() + chore.type.slice(1)}</Text>
            <View style={styles.choreMetaRow}>
              {!isMine && (
                <View style={styles.assigneeBadge}>
                  <Ionicons name="person-outline" size={12} color="#6B7083" />
                  <Text style={styles.assigneeText}>{chore.assignedName}</Text>
                </View>
              )}
              <View style={[styles.dueBadge, isOverdue && styles.overdueBadge]}>
                <Ionicons 
                  name={isOverdue ? "alert-circle" : "time-outline"} 
                  size={12} 
                  color={isOverdue ? "#FF3B30" : "#8F9BB3"} 
                />
                <Text style={[styles.dueText, isOverdue && styles.overdueText]}>
                  {formatDueDate(chore.dueBy)}
                </Text>
              </View>
              {chore.triggeredBy === 'sensor' && (
                <View style={styles.sensorBadge}>
                  <Ionicons name="hardware-chip-outline" size={12} color="#4059ffff" />
                </View>
              )}
            </View>
          </View>
        </View>
        {isMine && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => handleCompleteChore(chore.id)}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4059ffff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#4059ffff" />
      
      {/* Header with Gradient */}
      <LinearGradient colors={["#4059ffff", "#5b31beff"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>My Chores</Text>
            <Text style={styles.subtitle}>
              {myChores.length} active {myChores.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content Card */}
      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContent}>
          
          {/* My Chores Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#4059ffff" />
              <Text style={styles.sectionTitle}>Your Tasks</Text>
            </View>
            
            {myChores.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#34C759" />
                <Text style={styles.emptyText}>All done!</Text>
                <Text style={styles.emptySubtext}>No active chores assigned to you</Text>
              </View>
            ) : (
              myChores.map(chore => (
                <ChoreCard key={chore.id} chore={chore} isMine={true} />
              ))
            )}
          </View>

          {/* Others' Chores Section */}
          {othersChores.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color="#8F9BB3" />
                <Text style={[styles.sectionTitle, { color: '#6B7083' }]}>Roommates' Tasks</Text>
              </View>
              
              {othersChores.map(chore => (
                <ChoreCard key={chore.id} chore={chore} isMine={false} />
              ))}
            </View>
          )}

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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  choreCard: {
    backgroundColor: '#f3f3f3ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  choreInfo: {
    flex: 1,
  },
  choreName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4E9F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  assigneeText: {
    fontSize: 12,
    color: '#6B7083',
    fontWeight: '600',
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4E9F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  overdueBadge: {
    backgroundColor: '#FFEBEE',
  },
  dueText: {
    fontSize: 12,
    color: '#8F9BB3',
    fontWeight: '600',
  },
  overdueText: {
    color: '#FF3B30',
  },
  sensorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f3f3f3ff',
    borderRadius: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8F9BB3',
    textAlign: 'center',
  },
});