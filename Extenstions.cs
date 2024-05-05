using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace BaseBall_Video_Manager
{
    public static class MyExtensions
    {
        public static string ToStr(this string str)
        {
            return str == null ? string.Empty : str;
        }
        public static string ToNodeText(this XmlNode node)
        {
            return node == null ? string.Empty : node.InnerText;
        }
    }
}
