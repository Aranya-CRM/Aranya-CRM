export type WellbeingDomain =
  | 'physicalHealth'
  | 'mentalHealth'
  | 'socialSupport'
  | 'financialStability'
  | 'livingConditions'
  | 'spiritualWellbeing'
  | 'legalIssues'
  | 'substanceUse'

export interface Client {
  id: string
  abbr: string
  nameEn: string
  nameChn: string
  nricNameEn: string
  nricNameChn: string
  nricNo: string
  sex: 'Male' | 'Female'
  dateOfBirth: string
  age: number
  maritalStatus: 'Never married' | 'Married' | 'Divorced' | 'Separated' | 'Widowed'
  nationality: string
  ethnicity: string
  dialectGroup: string
  contact: string
  nextOfKin: string
  preferredCommunication: 'WhatsApp Msg' | 'WhatsApp Audio' | 'Phone Call' | 'Home Visit'
  ableToUseWhatsApp: boolean
  preferredLanguage: string
  spokenLanguage: string
  address: string
  postalCode: string
  viharaType: string
  area: string
  dateJoined: string
  membershipRemarks: string
  // Ordination
  buddhistTradition: 'Mahayana' | 'Theravada' | 'Vajrayana'
  ordinationStatus: 'Bhikkhu' | 'Bhikkhuni' | 'Samanera' | 'Sikkhamana' | 'Sayalay'
  dateTonsure: string
  countryTonsure: string
  placeTonsure: string
  dateOrdination: string
  countryOrdination: string
  placeOrdination: string
  ordinationYears: number
  ordinationCertificate: 'Completed' | 'Incomplete'
  dateVerification: string
  // Wellbeing
  wellbeingIssues: Record<WellbeingDomain, boolean>
  wellbeingRemarks: string
  specialNeeds: Record<'physical' | 'hearing' | 'visual' | 'intellectual', boolean>
  specialNeedsRemarks: string
  // Financial
  bankTransfer: boolean
  payNow: boolean
  comments: string
}

/** Subset of Client fields visible to volunteers */
export type ClientBasicInfo = Pick<
  Client,
  | 'id'
  | 'abbr'
  | 'nameEn'
  | 'nameChn'
  | 'contact'
  | 'preferredCommunication'
  | 'preferredLanguage'
  | 'area'
  | 'buddhistTradition'
  | 'ordinationStatus'
>

export interface RelatedContact {
  id: string
  clientId: string
  name: string
  relationship: string
  phone: string
  remarks: string
}
