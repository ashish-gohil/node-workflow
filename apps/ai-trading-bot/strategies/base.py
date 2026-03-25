class BaseStrategy:
    """
    Every strategy must follow this structure.
    This allows plug-and-play strategies.
    """

    def apply(self, df):
        """
        Input: dataframe
        Output: dataframe with new columns
        """
        raise NotImplementedError