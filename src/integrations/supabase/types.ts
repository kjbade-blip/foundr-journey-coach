export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_claim_verifications: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          verification_data: Json
          verification_status: string
          verification_type: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          verification_data?: Json
          verification_status?: string
          verification_type: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          verification_data?: Json
          verification_status?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_verifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claims: {
        Row: {
          business_id: string
          business_name: string | null
          created_at: string
          id: string
          rejected_reason: string | null
          status: string
          updated_at: string
          user_id: string
          verification_method: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          business_id: string
          business_name?: string | null
          created_at?: string
          id?: string
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          business_id?: string
          business_name?: string | null
          created_at?: string
          id?: string
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      business_verifications: {
        Row: {
          business_name: string
          confidence: number
          created_at: string
          id: string
          ip_address: string | null
          method: string
          place_id: string
          user_id: string
          verified_at: string
          verified_target: string | null
        }
        Insert: {
          business_name: string
          confidence?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          method: string
          place_id: string
          user_id: string
          verified_at?: string
          verified_target?: string | null
        }
        Update: {
          business_name?: string
          confidence?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          method?: string
          place_id?: string
          user_id?: string
          verified_at?: string
          verified_target?: string | null
        }
        Relationships: []
      }
      ci_alert_settings: {
        Row: {
          business_id: string | null
          closures: boolean
          created_at: string
          email_enabled: boolean
          frequency: string
          id: string
          major_changes: boolean
          market_changes: boolean
          new_competitors: boolean
          opportunities: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          closures?: boolean
          created_at?: string
          email_enabled?: boolean
          frequency?: string
          id?: string
          major_changes?: boolean
          market_changes?: boolean
          new_competitors?: boolean
          opportunities?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          closures?: boolean
          created_at?: string
          email_enabled?: boolean
          frequency?: string
          id?: string
          major_changes?: boolean
          market_changes?: boolean
          new_competitors?: boolean
          opportunities?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_alert_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_businesses: {
        Row: {
          address: string | null
          business_type: string
          created_at: string
          id: string
          is_primary: boolean
          lat: number
          lng: number
          name: string
          place_id: string | null
          radius_miles: number
          search_term: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat: number
          lng: number
          name: string
          place_id?: string | null
          radius_miles?: number
          search_term?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat?: number
          lng?: number
          name?: string
          place_id?: string | null
          radius_miles?: number
          search_term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ci_changes: {
        Row: {
          ai: Json | null
          business_id: string
          competitor_id: string | null
          created_at: string
          detail: string
          dismissed: boolean
          id: string
          kind: string
          metrics: Json
          priority: number
          read_at: string | null
          scan_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          ai?: Json | null
          business_id: string
          competitor_id?: string | null
          created_at?: string
          detail: string
          dismissed?: boolean
          id?: string
          kind: string
          metrics?: Json
          priority?: number
          read_at?: string | null
          scan_id?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          ai?: Json | null
          business_id?: string
          competitor_id?: string | null
          created_at?: string
          detail?: string
          dismissed?: boolean
          id?: string
          kind?: string
          metrics?: Json
          priority?: number
          read_at?: string | null
          scan_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_changes_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "ci_competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_changes_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "ci_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_competitors: {
        Row: {
          address: string | null
          business_id: string
          category: string | null
          competitor_score: number | null
          created_at: string
          dismissed_reason: string | null
          distance_m: number | null
          first_seen_at: string
          id: string
          last_seen_at: string
          lat: number | null
          lng: number | null
          name: string
          place_id: string | null
          relevance: number
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_id: string
          category?: string | null
          competitor_score?: number | null
          created_at?: string
          dismissed_reason?: string | null
          distance_m?: number | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          name: string
          place_id?: string | null
          relevance?: number
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_id?: string
          category?: string | null
          competitor_score?: number | null
          created_at?: string
          dismissed_reason?: string | null
          distance_m?: number | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          name?: string
          place_id?: string | null
          relevance?: number
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_competitors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_decisions: {
        Row: {
          business_id: string | null
          business_type: string | null
          competitor_name: string | null
          competitor_place_id: string | null
          created_at: string
          decision: string
          distance_m: number | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          business_type?: string | null
          competitor_name?: string | null
          competitor_place_id?: string | null
          created_at?: string
          decision: string
          distance_m?: number | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          business_type?: string | null
          competitor_name?: string | null
          competitor_place_id?: string | null
          created_at?: string
          decision?: string
          distance_m?: number | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_decisions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_opportunities: {
        Row: {
          business_id: string
          confidence: string
          created_at: string
          id: string
          kind: string
          scan_id: string | null
          status: string
          title: string
          user_id: string
          what_to_consider: Json
          what_we_found: string
          why_it_matters: string
        }
        Insert: {
          business_id: string
          confidence?: string
          created_at?: string
          id?: string
          kind: string
          scan_id?: string | null
          status?: string
          title: string
          user_id: string
          what_to_consider?: Json
          what_we_found: string
          why_it_matters: string
        }
        Update: {
          business_id?: string
          confidence?: string
          created_at?: string
          id?: string
          kind?: string
          scan_id?: string | null
          status?: string
          title?: string
          user_id?: string
          what_to_consider?: Json
          what_we_found?: string
          why_it_matters?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_opportunities_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "ci_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_scans: {
        Row: {
          avg_rating: number | null
          avg_reviews: number | null
          business_id: string
          closed_competitors: number
          competition_score: number | null
          id: string
          market_density: number | null
          new_competitors: number
          ran_at: string
          summary: Json
          total_competitors: number
          tracked_competitors: number
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          avg_reviews?: number | null
          business_id: string
          closed_competitors?: number
          competition_score?: number | null
          id?: string
          market_density?: number | null
          new_competitors?: number
          ran_at?: string
          summary?: Json
          total_competitors?: number
          tracked_competitors?: number
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          avg_reviews?: number | null
          business_id?: string
          closed_competitors?: number
          competition_score?: number | null
          id?: string
          market_density?: number | null
          new_competitors?: number
          ran_at?: string
          summary?: Json
          total_competitors?: number
          tracked_competitors?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "ci_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_snapshots: {
        Row: {
          business_status: string | null
          captured_at: string
          category: string | null
          competitor_id: string
          competitor_score: number | null
          id: string
          opening_hours: Json
          price_level: string | null
          rating: number | null
          raw: Json
          reviews: number | null
          user_id: string
          website: string | null
        }
        Insert: {
          business_status?: string | null
          captured_at?: string
          category?: string | null
          competitor_id: string
          competitor_score?: number | null
          id?: string
          opening_hours?: Json
          price_level?: string | null
          rating?: number | null
          raw?: Json
          reviews?: number | null
          user_id: string
          website?: string | null
        }
        Update: {
          business_status?: string | null
          captured_at?: string
          category?: string | null
          competitor_id?: string
          competitor_score?: number | null
          id?: string
          opening_hours?: Json
          price_level?: string | null
          rating?: number | null
          raw?: Json
          reviews?: number | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "ci_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_house_areas: {
        Row: {
          active_count: number
          area_key: string
          created_at: string
          dissolved_12m: number
          dissolved_3y: number
          id: string
          incorporated_12m: number
          incorporated_3y: number
          latitude: number | null
          longitude: number | null
          median_age_years: number | null
          net_change_12m: number
          postcode_district: string | null
          radius_miles: number
          refresh_after: string
          retrieved_at: string
          sample: Json
          source: string
          source_url: string
          updated_at: string
        }
        Insert: {
          active_count?: number
          area_key: string
          created_at?: string
          dissolved_12m?: number
          dissolved_3y?: number
          id?: string
          incorporated_12m?: number
          incorporated_3y?: number
          latitude?: number | null
          longitude?: number | null
          median_age_years?: number | null
          net_change_12m?: number
          postcode_district?: string | null
          radius_miles?: number
          refresh_after: string
          retrieved_at?: string
          sample?: Json
          source?: string
          source_url?: string
          updated_at?: string
        }
        Update: {
          active_count?: number
          area_key?: string
          created_at?: string
          dissolved_12m?: number
          dissolved_3y?: number
          id?: string
          incorporated_12m?: number
          incorporated_3y?: number
          latitude?: number | null
          longitude?: number | null
          median_age_years?: number | null
          net_change_12m?: number
          postcode_district?: string | null
          radius_miles?: number
          refresh_after?: string
          retrieved_at?: string
          sample?: Json
          source?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      crime_area_months: {
        Row: {
          area_key: string
          by_category: Json
          created_at: string
          id: string
          latitude: number
          local_authority_code: string | null
          longitude: number
          lsoa_code: string | null
          month: string
          radius_miles: number
          refresh_after: string
          region_code: string | null
          retrieved_at: string
          source: string
          source_url: string
          total: number
          updated_at: string
        }
        Insert: {
          area_key: string
          by_category?: Json
          created_at?: string
          id?: string
          latitude: number
          local_authority_code?: string | null
          longitude: number
          lsoa_code?: string | null
          month: string
          radius_miles?: number
          refresh_after: string
          region_code?: string | null
          retrieved_at?: string
          source?: string
          source_url?: string
          total?: number
          updated_at?: string
        }
        Update: {
          area_key?: string
          by_category?: Json
          created_at?: string
          id?: string
          latitude?: number
          local_authority_code?: string | null
          longitude?: number
          lsoa_code?: string | null
          month?: string
          radius_miles?: number
          refresh_after?: string
          region_code?: string | null
          retrieved_at?: string
          source?: string
          source_url?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      crime_business_weights: {
        Row: {
          business_key: string
          category_slug: string
          created_at: string
          id: string
          note: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          business_key: string
          category_slug: string
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          business_key?: string
          category_slug?: string
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      crime_categories: {
        Row: {
          business_relevance: string | null
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_relevance?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_relevance?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      crime_reference_areas: {
        Row: {
          area_type: string
          created_at: string
          id: string
          key: string
          latitude: number
          longitude: number
          name: string
          population: number | null
          updated_at: string
        }
        Insert: {
          area_type: string
          created_at?: string
          id?: string
          key: string
          latitude: number
          longitude: number
          name: string
          population?: number | null
          updated_at?: string
        }
        Update: {
          area_type?: string
          created_at?: string
          id?: string
          key?: string
          latitude?: number
          longitude?: number
          name?: string
          population?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          provider: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          provider: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          provider?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      location_analyses: {
        Row: {
          analysis: Json
          business_type: string | null
          confidence_reason: string | null
          confidence_score: number | null
          created_at: string
          display_name: string
          evidence: Json
          id: string
          latitude: number | null
          location_profile_id: string | null
          longitude: number | null
          overall_score: number | null
          postcode: string | null
          radius_miles: number
          score_breakdown: Json
          updated_at: string
          user_id: string
          verdict: string | null
          verdict_reason: string | null
        }
        Insert: {
          analysis?: Json
          business_type?: string | null
          confidence_reason?: string | null
          confidence_score?: number | null
          created_at?: string
          display_name: string
          evidence?: Json
          id?: string
          latitude?: number | null
          location_profile_id?: string | null
          longitude?: number | null
          overall_score?: number | null
          postcode?: string | null
          radius_miles?: number
          score_breakdown?: Json
          updated_at?: string
          user_id: string
          verdict?: string | null
          verdict_reason?: string | null
        }
        Update: {
          analysis?: Json
          business_type?: string | null
          confidence_reason?: string | null
          confidence_score?: number | null
          created_at?: string
          display_name?: string
          evidence?: Json
          id?: string
          latitude?: number | null
          location_profile_id?: string | null
          longitude?: number | null
          overall_score?: number | null
          postcode?: string | null
          radius_miles?: number
          score_breakdown?: Json
          updated_at?: string
          user_id?: string
          verdict?: string | null
          verdict_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_analyses_location_profile_id_fkey"
            columns: ["location_profile_id"]
            isOneToOne: false
            referencedRelation: "location_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_profiles: {
        Row: {
          cache_key: string
          created_at: string
          display_name: string
          evidence: Json
          geographies: Json
          id: string
          latitude: number | null
          longitude: number | null
          postcode: string | null
          primary_geography_code: string
          primary_geography_type: string
          profile: Json
          refresh_after: string
          retrieved_at: string
          unavailable: Json
          updated_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          display_name: string
          evidence?: Json
          geographies?: Json
          id?: string
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          primary_geography_code: string
          primary_geography_type: string
          profile?: Json
          refresh_after: string
          retrieved_at?: string
          unavailable?: Json
          updated_at?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          display_name?: string
          evidence?: Json
          geographies?: Json
          id?: string
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          primary_geography_code?: string
          primary_geography_type?: string
          profile?: Json
          refresh_after?: string
          retrieved_at?: string
          unavailable?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ons_geographies: {
        Row: {
          country: string | null
          created_at: string
          geography_code: string
          geography_type: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          parent_code: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          geography_code: string
          geography_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          geography_code?: string
          geography_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ons_observations: {
        Row: {
          category: string
          created_at: string
          dataset_id: string
          dataset_name: string
          geography_code: string
          geography_name: string | null
          geography_type: string
          id: string
          metric: string
          reference_period: string
          refresh_after: string
          retrieved_at: string
          source: string
          source_url: string | null
          unit: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          dataset_id: string
          dataset_name: string
          geography_code: string
          geography_name?: string | null
          geography_type: string
          id?: string
          metric: string
          reference_period: string
          refresh_after: string
          retrieved_at?: string
          source?: string
          source_url?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          dataset_id?: string
          dataset_name?: string
          geography_code?: string
          geography_name?: string | null
          geography_type?: string
          id?: string
          metric?: string
          reference_period?: string
          refresh_after?: string
          retrieved_at?: string
          source?: string
          source_url?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_business_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed_at: string | null
          onboarding_path: string | null
          other_url: string | null
          phone: string | null
          postcode: string | null
          role_title: string | null
          updated_at: string
          website_url: string | null
          x_url: string | null
        }
        Insert: {
          active_business_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          onboarding_path?: string | null
          other_url?: string | null
          phone?: string | null
          postcode?: string | null
          role_title?: string | null
          updated_at?: string
          website_url?: string | null
          x_url?: string | null
        }
        Update: {
          active_business_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          onboarding_path?: string | null
          other_url?: string | null
          phone?: string | null
          postcode?: string | null
          role_title?: string | null
          updated_at?: string
          website_url?: string | null
          x_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_business_id_fkey"
            columns: ["active_business_id"]
            isOneToOne: false
            referencedRelation: "user_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_businesses: {
        Row: {
          address: string | null
          company_number: string | null
          created_at: string
          id: string
          industry: string | null
          latitude: number | null
          longitude: number | null
          name: string
          place_id: string | null
          postcode: string | null
          source: string
          status: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_number?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          place_id?: string | null
          postcode?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_number?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          place_id?: string | null
          postcode?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      user_journey_stages: {
        Row: {
          created_at: string
          id: string
          progress: number
          stage_index: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress?: number
          stage_index: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          progress?: number
          stage_index?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_audit_log: {
        Row: {
          created_at: string
          detail: string | null
          event: string
          id: string
          ip_address: string | null
          method: string | null
          place_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event: string
          id?: string
          ip_address?: string | null
          method?: string | null
          place_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          method?: string | null
          place_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          masked_target: string
          max_attempts: number
          method: string
          place_id: string
          target_hash: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          masked_target: string
          max_attempts?: number
          method: string
          place_id: string
          target_hash: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          masked_target?: string
          max_attempts?: number
          method?: string
          place_id?: string
          target_hash?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
