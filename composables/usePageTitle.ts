export const usePageTitle = () => {
    return useState<string>('pageTitle', () => '')
  }