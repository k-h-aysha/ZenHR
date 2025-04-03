import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, useColorScheme, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';

interface TeamMember {
    id: string;
    full_name: string;
    position: string;
    department: string;
    avatar_url: string;
    email: string;
    job_title: string;
}

interface Department {
    name: string;
    members: TeamMember[];
}

export default function TeamPage() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'employee')
                .order('full_name');

            if (error) throw error;

            // Group members by department
            const departmentMap = new Map<string, TeamMember[]>();
            data?.forEach(member => {
                const dept = member.dept || 'Unassigned';
                if (!departmentMap.has(dept)) {
                    departmentMap.set(dept, []);
                }
                departmentMap.get(dept)?.push(member);
            });

            // Convert map to array of departments
            const departmentsArray = Array.from(departmentMap.entries()).map(([name, members]) => ({
                name,
                members
            }));

            setDepartments(departmentsArray);
            if (departmentsArray.length > 0) {
                setSelectedDepartment(departmentsArray[0].name);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDepartmentHeader = ({ item }: { item: Department }) => (
        <TouchableOpacity
            style={[
                styles.departmentHeader,
                selectedDepartment === item.name && styles.selectedDepartment
            ]}
            onPress={() => setSelectedDepartment(item.name)}
        >
            <View style={styles.departmentHeaderContent}>
                <Ionicons 
                    name="business-outline" 
                    size={24} 
                    color={selectedDepartment === item.name ? '#ffffff' : '#64748b'} 
                />
                <ThemedText style={[
                    styles.departmentName,
                    selectedDepartment === item.name && styles.selectedDepartmentText
                ]}>
                    {item.name}
                </ThemedText>
                <ThemedText style={[
                    styles.memberCount,
                    selectedDepartment === item.name && styles.selectedDepartmentText
                ]}>
                    {item.members.length} members
                </ThemedText>
            </View>
        </TouchableOpacity>
    );

    const renderTeamMember = ({ item }: { item: TeamMember }) => (
        <TouchableOpacity 
            style={[
                styles.memberCard,
                { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
            ]}
            activeOpacity={0.7}
            onPress={() => {
                // Navigate to member details if needed
                console.log('View member details:', item.id);
            }}
        >
            <Image 
                source={{ uri: item.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }} 
                style={styles.avatar} 
            />
            <View style={styles.memberInfo}>
                <ThemedText style={styles.memberName}>{item.full_name}</ThemedText>
                <ThemedText style={styles.memberRole}>{item.job_title || 'No title'}</ThemedText>
                <ThemedText style={styles.memberEmail}>{item.email}</ThemedText>
            </View>
            <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
            />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const selectedDepartmentData = departments.find(d => d.name === selectedDepartment);

    return (
        <View style={[
            styles.container, 
            { 
                paddingTop: insets.top,
                backgroundColor: isDark ? '#111827' : '#f9fafb'
            }
        ]}>
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                style={styles.header}
            >
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons 
                        name="arrow-back" 
                        size={24} 
                        color="#ffffff"
                    />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>
                    Team Members
                </ThemedText>
                <View style={styles.headerRight} />
            </LinearGradient>

            <View style={styles.content}>
                <FlatList
                    data={departments}
                    keyExtractor={(item) => item.name}
                    renderItem={renderDepartmentHeader}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.departmentsList}
                />

                <ScrollView style={styles.membersList}>
                    {selectedDepartmentData?.members.map(member => (
                        <View key={member.id}>
                            {renderTeamMember({ item: member })}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerRight: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    departmentsList: {
        maxHeight: 60,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    departmentHeader: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    selectedDepartment: {
        backgroundColor: '#3b82f6',
    },
    departmentHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    departmentName: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
        color: '#64748b',
    },
    selectedDepartmentText: {
        color: '#ffffff',
    },
    memberCount: {
        fontSize: 12,
        marginLeft: 8,
        color: '#94a3b8',
    },
    membersList: {
        flex: 1,
        padding: 16,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 16,
        backgroundColor: '#f3f4f6',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    memberRole: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 2,
    },
    memberEmail: {
        fontSize: 12,
        color: '#94a3b8',
    },
}); 