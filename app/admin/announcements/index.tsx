import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
    created_by: string;
}

export default function AnnouncementsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: ''
    });
    const [subscriptions, setSubscriptions] = useState<RealtimeChannel[]>([]);

    useEffect(() => {
        fetchAnnouncements();
        setupRealtimeSubscription();
    }, []);

    const setupRealtimeSubscription = () => {
        const subscription = supabase
            .channel('announcements_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'announcements'
                },
                () => {
                    fetchAnnouncements();
                }
            )
            .subscribe();

        setSubscriptions([subscription]);

        return () => {
            subscriptions.forEach(subscription => subscription.unsubscribe());
        };
    };

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            Alert.alert('Error', 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('announcements')
                .insert([
                    {
                        title: newAnnouncement.title.trim(),
                        content: newAnnouncement.content.trim(),
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    }
                ]);

            if (error) throw error;

            setNewAnnouncement({ title: '', content: '' });
            setShowNewAnnouncement(false);
            Alert.alert('Success', 'Announcement created successfully');
        } catch (error) {
            console.error('Error creating announcement:', error);
            Alert.alert('Error', 'Failed to create announcement');
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            Alert.alert('Success', 'Announcement deleted successfully');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            Alert.alert('Error', 'Failed to delete announcement');
        }
    };

    const showDeleteConfirmation = (id: string) => {
        Alert.alert(
            'Delete Announcement',
            'Are you sure you want to delete this announcement?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteAnnouncement(id)
                }
            ]
        );
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchAnnouncements();
        setRefreshing(false);
    }, []);

    if (loading) {
        return (
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                style={[styles.container, { paddingTop: insets.top }]}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#93c5fd" />
                    <ThemedText style={styles.loadingText}>Loading announcements...</ThemedText>
                </View>
            </LinearGradient>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                style={[styles.container, { paddingTop: insets.top }]}
            >
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#93c5fd"
                            colors={['#93c5fd']}
                            progressBackgroundColor="#1e3a8a"
                        />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <ThemedText style={styles.headerTitle}>Announcements</ThemedText>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowNewAnnouncement(true)}
                        >
                            <Ionicons name="add" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    {/* New Announcement Form */}
                    {showNewAnnouncement && (
                        <View style={styles.newAnnouncementForm}>
                            <TextInput
                                style={styles.input}
                                placeholder="Announcement Title"
                                placeholderTextColor="#94a3b8"
                                value={newAnnouncement.title}
                                onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, title: text }))}
                            />
                            <TextInput
                                style={[styles.input, styles.contentInput]}
                                placeholder="Announcement Content"
                                placeholderTextColor="#94a3b8"
                                multiline
                                numberOfLines={4}
                                value={newAnnouncement.content}
                                onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, content: text }))}
                            />
                            <View style={styles.formButtons}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={() => {
                                        setShowNewAnnouncement(false);
                                        setNewAnnouncement({ title: '', content: '' });
                                    }}
                                >
                                    <ThemedText style={styles.buttonText}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.submitButton]}
                                    onPress={handleCreateAnnouncement}
                                >
                                    <ThemedText style={styles.buttonText}>Post</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Announcements List */}
                    <View style={styles.announcementsList}>
                        {announcements.map((announcement) => (
                            <View key={announcement.id} style={styles.announcementCard}>
                                <View style={styles.announcementHeader}>
                                    <View style={styles.titleContainer}>
                                        <Ionicons name="megaphone" size={20} color="#3b82f6" style={styles.titleIcon} />
                                        <ThemedText style={styles.announcementTitle}>
                                            {announcement.title}
                                        </ThemedText>
                                    </View>
                                    <View style={styles.headerRight}>
                                        <ThemedText style={styles.announcementDate}>
                                            {new Date(announcement.created_at).toLocaleDateString()}
                                        </ThemedText>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => showDeleteConfirmation(announcement.id)}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <ThemedText style={styles.announcementContent}>
                                    {announcement.content}
                                </ThemedText>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    backButton: {
        padding: 8,
    },
    addButton: {
        padding: 8,
    },
    newAnnouncementForm: {
        backgroundColor: 'rgba(255, 255, 255, 0.11)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        marginBottom: 12,
    },
    contentInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.82)',
    },
    submitButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.81)',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    announcementsList: {
        gap: 16,
    },
    announcementCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    announcementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    titleIcon: {
        marginRight: 8,
    },
    announcementTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
    },
    announcementDate: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 8,
    },
    announcementContent: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 4,
    },
}); 