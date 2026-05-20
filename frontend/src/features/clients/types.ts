export type WellbeingDomain =
  | 'physicalHealth'
  | 'mentalHealth'
  | 'socialSupport'
  | 'financialStability'
  | 'livingConditions'
  | 'spiritual'
  | 'legalIssues'

export interface Client {
  id: string
  abbr: string
  nameEn: string
  nameChn: string
  nricNameEn: string
  nricNameChn: string
  nricNo: string
  gender: 'Male' | 'Female'
  dateOfBirth: string
  age: number
  maritalStatus: 'Never married' | 'Married' | 'Divorced' | 'Separated' | 'Widowed'
  nationality: string
  ethnicity: string
  dialectGroup: string
  contact: string
  nextOfKinContact: string
  preferredCommunication: 'WhatsApp Msg' | 'WhatsApp Audio' | 'Phone Call' | 'Home Visit'
  whatsappEnabled: boolean
  preferredLanguage: string
  spokenLanguage: string
  addressText: string
  postalCode: string
  viharaType: string
  areaDistrict: string
  dateJoined: string
  membershipRemarks: string
  // Ordination
  buddhistTradition: 'Mahayana' | 'Theravada' | 'Vajrayana'
  ordinationStatus: 'Bhikkhu' | 'Bhikkhuni' | 'Samanera' | 'Sikkhamana' | 'Sayalay'
  dateOfTonsure: string
  countryOfTonsure: string
  placeOfTonsure: string
  dateOfOrdination: string
  countryOfOrdination: string
  placeOfOrdination: string
  ordinationYears: number
  ordinationCertificate: 'Completed' | 'Incomplete'
  dateOfVerification: string
  // Wellbeing
  wellbeingIssues: Record<WellbeingDomain, boolean>
  wellbeingRemarks: string
  specialNeeds: Record<'physical' | 'hearing' | 'visual' | 'intellectual', boolean>
  specialNeedsRemarks: string
  // Financial
  bankTransferInfo: string
  payNowInfo: string
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
  | 'areaDistrict'
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
